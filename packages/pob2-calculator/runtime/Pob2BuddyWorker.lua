-- Loaded only inside an isolated PoB2 runtime copy. It is not part of the user's install.
-- The copy's Build.lua calls this file when POB2_CALC_WORKER=1.

local build = ...
local port = tonumber(os.getenv("POB2_CALC_PORT") or "")
local json = require("dkjson")
local socket = require("socket")

local PROTOCOL_VERSION = 2

local METRICS = {
	"Life", "Mana", "Spirit", "EnergyShield", "Armour", "Evasion",
	"DeflectionRating", "DeflectChance", "FireResist", "ColdResist",
	"LightningResist", "ChaosResist", "TotalDPS", "CombinedDPS",
	"AverageDamage", "AverageHit", "CritChance", "CritMultiplier",
	"Speed", "CastRate", "HitChance", "TotalEHP",
}

local ALLOCATION_MODE = {
	shared = 0,
	weaponSet1 = 1,
	weaponSet2 = 2,
	weaponSet3 = 3,
}

local function logLine(message)
	local handle = io.open("calculator-diagnostics.log", "a")
	if not handle then
		return
	end
	handle:write(os.date("!%Y-%m-%dT%H:%M:%SZ "), tostring(message), "\n")
	handle:close()
end

local function skillTypeNames(set)
	local names = {}
	if type(set) ~= "table" or type(SkillType) ~= "table" then
		return names
	end
	for key, value in pairs(SkillType) do
		if type(key) == "string" and set[value] then
			names[#names + 1] = key
		end
	end
	table.sort(names)
	return names
end

local function flagNames(set)
	local names = {}
	if type(set) ~= "table" then
		return names
	end
	for key, value in pairs(set) do
		if value == true and type(key) == "string" then
			names[#names + 1] = key
		end
	end
	table.sort(names)
	return names
end

local function skillIdentity(current)
	local index = current.mainSocketGroup
	local groups = current.skillsTab and current.skillsTab.socketGroupList or nil
	local group = groups and groups[index] or nil
	local display = group and group.displaySkillList and group.displaySkillList[group.mainActiveSkill] or nil
	local effect = display and display.activeEffect or nil
	local granted = effect and effect.grantedEffect or nil
	local active = effect and effect.srcInstance or nil
	local mainSkill = current.calcsTab
		and current.calcsTab.mainEnv
		and current.calcsTab.mainEnv.player
		and current.calcsTab.mainEnv.player.mainSkill
		or nil
	return {
		name = (granted and granted.name) or json.null,
		effectId = (granted and granted.id) or json.null,
		sourceGem = (active and active.nameSpec) or json.null,
		skillTypes = skillTypeNames((mainSkill and mainSkill.skillTypes) or (granted and granted.skillTypes) or nil),
		baseFlags = flagNames((mainSkill and mainSkill.skillFlags) or nil),
	}
end

local function metricsOf(current)
	local output = current.calcsTab and current.calcsTab.mainOutput or nil
	local found = {}
	if type(output) ~= "table" then
		return found
	end
	for _, key in ipairs(METRICS) do
		if type(output[key]) == "number" then
			found[key] = output[key]
		end
	end
	return found
end

local function weaponSetNodes(spec)
	local rows = {}
	for id, node in pairs(spec.allocNodes or {}) do
		if type(id) == "number" and node.alloc and (node.allocMode or 0) > 0 then
			rows[#rows + 1] = { id = id, allocMode = node.allocMode }
		end
	end
	table.sort(rows, function(left, right)
		return left.id < right.id
	end)
	return rows
end

local function fail(requestId, code, extra)
	local response = {
		ok = false,
		requestId = requestId,
		protocolVersion = PROTOCOL_VERSION,
		error = { code = code },
	}
	if extra then
		for key, value in pairs(extra) do
			response[key] = value
		end
	end
	return response
end

local function loadBuild(current, xml)
	current.abortSave = true
	current:Shutdown()
	current:Init(nil, "Calculator", xml)
	if not current.calcsTab or not current.calcsTab.mainOutput or not current.spec then
		return false
	end
	return true
end

local function restore(spec, undo)
	spec:RestoreUndoState(undo, spec.treeVersion)
	spec.allocMode = 0
	spec.build.calcsTab:BuildOutput()
end

local function sortedCopy(ids)
	local copy = {}
	for index, id in ipairs(ids) do
		copy[index] = id
	end
	table.sort(copy)
	return copy
end

local function setDifference(expected, actual)
	local actualSet = {}
	for _, id in ipairs(actual) do
		actualSet[id] = true
	end
	local expectedSet = {}
	for _, id in ipairs(expected) do
		expectedSet[id] = true
	end
	local missing = {}
	local unexpected = {}
	for _, id in ipairs(expected) do
		if not actualSet[id] then
			missing[#missing + 1] = id
		end
	end
	for _, id in ipairs(actual) do
		if not expectedSet[id] then
			unexpected[#unexpected + 1] = id
		end
	end
	table.sort(missing)
	table.sort(unexpected)
	return missing, unexpected
end

local function allocationReport(requested, actual, mode)
	local missing, unexpected = setDifference(requested, actual)
	return {
		requestedNodeIds = requested,
		expectedNodeIds = requested,
		actuallyAllocatedNodeIds = actual,
		unexpectedNodeIds = unexpected,
		missingNodeIds = missing,
		allocationMode = mode,
	}
end

local function sameIdList(left, right)
	if #left ~= #right then
		return false
	end
	for index = 1, #left do
		if left[index] ~= right[index] then
			return false
		end
	end
	return true
end

local replaceItem

local function handle(current, request)
	local requestId = request.requestId
	if request.protocolVersion ~= PROTOCOL_VERSION then
		return fail(requestId, "protocol-invalid")
	end
	if request.action == "health" then
		return {
			ok = true,
			requestId = requestId,
			protocolVersion = PROTOCOL_VERSION,
			pobVersion = launch.versionNumber,
		}
	end
	if type(request.buildXml) ~= "string" or request.buildXml == "" then
		return fail(requestId, "build-load-failed")
	end
	local loadedOk, loadedErr = pcall(loadBuild, current, request.buildXml)
	if not loadedOk or loadedErr ~= true then
		logLine("build-load-failed " .. tostring(loadedErr))
		return fail(requestId, "build-load-failed")
	end
	if current.spec.treeVersion ~= request.expectTree or launch.versionNumber ~= request.expectPob then
		return fail(requestId, "version-incompatible")
	end
	local baselineMetrics = metricsOf(current)
	local baselineSkill = skillIdentity(current)
	local sets = weaponSetNodes(current.spec)
	if request.action == "baseline" then
		return {
			ok = true,
			requestId = requestId,
			protocolVersion = PROTOCOL_VERSION,
			pobVersion = launch.versionNumber,
			treeKey = current.spec.treeVersion,
			baseline = { metrics = baselineMetrics, skill = baselineSkill },
			weaponSetNodes = sets,
		}
	end
	if request.action == "evaluate-item-replacement" then
		return replaceItem(current, requestId, request, baselineMetrics, baselineSkill)
	end
	if request.action ~= "evaluate-passive-candidate" then
		return fail(requestId, "protocol-invalid")
	end
	local candidate = request.candidate
	local mode = candidate and ALLOCATION_MODE[candidate.allocationMode] or nil
	local nodeIds = candidate and candidate.nodeIds or nil
	if mode == nil or type(nodeIds) ~= "table" or #nodeIds == 0 then
		return fail(requestId, "candidate-invalid")
	end
	local spec = current.spec
	for _, id in ipairs(nodeIds) do
		if type(id) ~= "number" or not spec.nodes[id] then
			return fail(requestId, "passive-node-unknown")
		end
	end
	local requested = sortedCopy(nodeIds)
	local already = {}
	for _, id in ipairs(requested) do
		if spec.nodes[id].alloc then
			already[#already + 1] = id
		end
	end
	if #already > 0 then
		return fail(requestId, "candidate-allocation-mismatch", {
			allocation = allocationReport(requested, {}, candidate.allocationMode),
			baseline = { metrics = baselineMetrics, skill = baselineSkill },
			restoreMetrics = baselineMetrics,
		})
	end
	local beforeAlloc = {}
	for id, node in pairs(spec.allocNodes or {}) do
		if type(id) == "number" and node.alloc then
			beforeAlloc[id] = true
		end
	end
	local undo = spec:CreateUndoState()
	spec.allocMode = mode
	local allocFailed = false
	for _, id in ipairs(requested) do
		local node = spec.nodes[id]
		if not node.alloc then
			spec:AllocNode(node)
			if not node.alloc then
				allocFailed = true
				break
			end
		end
	end
	local allocated = {}
	for id, node in pairs(spec.allocNodes or {}) do
		if type(id) == "number" and node.alloc and not beforeAlloc[id] then
			allocated[#allocated + 1] = id
		end
	end
	table.sort(allocated)
	if allocFailed or not sameIdList(requested, allocated) then
		restore(spec, undo)
		local restoredMetrics = metricsOf(current)
		local sameRestore = true
		for key, value in pairs(baselineMetrics) do
			if restoredMetrics[key] ~= value then
				sameRestore = false
			end
		end
		for key, value in pairs(restoredMetrics) do
			if baselineMetrics[key] ~= value then
				sameRestore = false
			end
		end
		if not sameRestore then
			return fail(requestId, "restore-failed")
		end
		return fail(requestId, "candidate-allocation-mismatch", {
			allocation = allocationReport(requested, allocated, candidate.allocationMode),
			baseline = { metrics = baselineMetrics, skill = baselineSkill },
			restoreMetrics = restoredMetrics,
		})
	end
	current.calcsTab:BuildOutput()
	local afterMetrics = metricsOf(current)
	local afterSkill = skillIdentity(current)
	restore(spec, undo)
	local restoredMetrics = metricsOf(current)
	return {
		ok = true,
		requestId = requestId,
		protocolVersion = PROTOCOL_VERSION,
		pobVersion = launch.versionNumber,
		treeKey = spec.treeVersion,
		baseline = { metrics = baselineMetrics, skill = baselineSkill },
		candidate = {
			metrics = afterMetrics,
			skill = afterSkill,
			allocatedNodeIds = allocated,
			allocationMode = candidate.allocationMode,
		},
		restoreMetrics = restoredMetrics,
		weaponSetNodes = sets,
	}
end

replaceItem = function(current, requestId, request, baselineMetrics, baselineSkill)
	local itemRequest = request.item
	local slotName = itemRequest and itemRequest.slot or nil
	local rawText = itemRequest and itemRequest.rawText or nil
	if type(slotName) ~= "string" or type(rawText) ~= "string" or rawText == "" then
		return fail(requestId, "item-invalid")
	end
	local slot = current.itemsTab and current.itemsTab.slots and current.itemsTab.slots[slotName] or nil
	if not slot then
		return fail(requestId, "item-slot-unsupported")
	end
	local previousId = slot.selItemId or 0
	local previousItem = previousId ~= 0 and current.itemsTab.items[previousId] or nil
	local createdOk, created = pcall(new, "Item", rawText)
	if not createdOk or type(created) ~= "table" or not created.baseName or created.baseName == "" then
		return fail(requestId, "item-invalid")
	end
	local equippedOk, equippedErr = pcall(function()
		current.itemsTab:AddItem(created, true)
		slot:SetSelItemId(created.id)
		current.calcsTab:BuildOutput()
	end)
	if not equippedOk or slot.selItemId ~= created.id then
		logLine("item-replacement-failed " .. tostring(equippedErr))
		pcall(function()
			slot:SetSelItemId(previousId)
			if created.id then
				current.itemsTab:DeleteItem(created, true)
			end
			current.calcsTab:BuildOutput()
		end)
		return fail(requestId, "item-replacement-failed")
	end
	local afterMetrics = metricsOf(current)
	local afterSkill = skillIdentity(current)
	local restoredOk = pcall(function()
		slot:SetSelItemId(previousId)
		current.itemsTab:DeleteItem(created, true)
		current.calcsTab:BuildOutput()
	end)
	local restoredMetrics = metricsOf(current)
	local restoredId = slot.selItemId or 0
	if not restoredOk or restoredId ~= previousId then
		return fail(requestId, "restore-failed")
	end
	return {
		ok = true,
		requestId = requestId,
		protocolVersion = PROTOCOL_VERSION,
		pobVersion = launch.versionNumber,
		treeKey = current.spec.treeVersion,
		baseline = { metrics = baselineMetrics, skill = baselineSkill },
		item = {
			slot = slotName,
			metrics = afterMetrics,
			skill = afterSkill,
			baselineItemId = previousId ~= 0 and previousId or json.null,
			baselineItemRaw = previousItem and previousItem.raw or json.null,
			restoredItemId = restoredId ~= 0 and restoredId or json.null,
		},
		restoreMetrics = restoredMetrics,
	}
end

if not port then
	logLine("missing port")
	return
end

local client = socket.tcp()
client:settimeout(15)
local connected, connectErr = client:connect("127.0.0.1", port)
if not connected then
	logLine("connect failed " .. tostring(connectErr))
	return
end
client:settimeout(120)

while true do
	local line, readErr = client:receive("*l")
	if not line then
		logLine("socket closed " .. tostring(readErr))
		break
	end
	local request, _, decodeErr = json.decode(line)
	local response
	if type(request) ~= "table" or type(request.requestId) ~= "string" then
		response = { ok = false, requestId = "invalid", protocolVersion = PROTOCOL_VERSION, error = { code = "protocol-invalid" } }
		logLine("protocol-invalid " .. tostring(decodeErr))
	else
		local callOk, callResult = pcall(handle, build, request)
		if callOk then
			response = callResult
		else
			logLine("calculation-failed " .. tostring(callResult))
			response = fail(request.requestId, "calculation-failed")
		end
	end
	client:send(json.encode(response) .. "\n")
end

client:close()
