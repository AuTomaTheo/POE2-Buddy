-- Research probe. Path of Building loads this file only when POB2_SPIKE_SCRIPT is set.
-- It is not part of the production app.

local build = ...
local outPath = os.getenv("POB2_SPIKE_OUT")
local caseDir = os.getenv("POB2_SPIKE_DIR")

local METRICS = {
	"Life", "Mana", "Spirit", "EnergyShield", "Armour", "Evasion",
	"DeflectionRating", "DeflectChance", "FireResist", "ColdResist",
	"LightningResist", "ChaosResist", "TotalDPS", "CombinedDPS",
	"AverageDamage", "AverageHit", "CritChance", "CritMultiplier",
	"Speed", "CastRate", "HitChance", "TotalEHP", "LifeRegen",
	"FullDPS", "PhysicalDPS", "FireDPS", "ColdDPS", "LightningDPS", "ChaosDPS",
}

local NODE_IDS = { 54447, 4739, 18845, 32699, 1755, 41965 }

local function jsonEscape(value)
	return (tostring(value)
		:gsub("\\", "\\\\")
		:gsub("\"", "\\\"")
		:gsub("\r", "\\r")
		:gsub("\n", "\\n"))
end

local function isArray(value)
	local count = 0
	for key in pairs(value) do
		if type(key) ~= "number" then
			return false
		end
		count = count + 1
	end
	return count == #value
end

local function encode(value)
	local kind = type(value)
	if value == nil then
		return "null"
	end
	if kind == "boolean" then
		return value and "true" or "false"
	end
	if kind == "number" then
		if value ~= value or value == math.huge or value == -math.huge then
			return "null"
		end
		return string.format("%.10g", value)
	end
	if kind == "string" then
		return "\"" .. jsonEscape(value) .. "\""
	end
	if kind ~= "table" then
		return "null"
	end
	if isArray(value) then
		local parts = {}
		for index = 1, #value do
			parts[index] = encode(value[index])
		end
		return "[" .. table.concat(parts, ",") .. "]"
	end
	local parts = {}
	for key, item in pairs(value) do
		if type(key) == "string" or type(key) == "number" then
			parts[#parts + 1] = encode(tostring(key)) .. ":" .. encode(item)
		end
	end
	table.sort(parts)
	return "{" .. table.concat(parts, ",") .. "}"
end

local function writeReport(report)
	local handle = io.open(outPath, "w")
	if not handle then
		return
	end
	handle:write(encode(report))
	handle:close()
end

local function timed(fn)
	local started = GetTime()
	local ok, value = pcall(fn)
	return GetTime() - started, ok, value
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

local function sameMetrics(left, right)
	return encode(left) == encode(right)
end

local function deltaMetrics(before, after)
	local rows = {}
	local keys = {}
	for key in pairs(before or {}) do
		keys[key] = true
	end
	for key in pairs(after or {}) do
		keys[key] = true
	end
	for key in pairs(keys) do
		local left = before and before[key] or nil
		local right = after and after[key] or nil
		if type(left) == "number" and type(right) == "number" and left ~= right then
			local row = {
				metric = key,
				before = left,
				after = right,
				absoluteDelta = right - left,
			}
			if left ~= 0 then
				row.percentDelta = (right - left) / math.abs(left) * 100
			end
			rows[#rows + 1] = row
		end
	end
	table.sort(rows, function(left, right)
		return left.metric < right.metric
	end)
	return rows
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

local function skillSnapshot(current)
	local index = current.mainSocketGroup
	local groups = current.skillsTab and current.skillsTab.socketGroupList or nil
	local group = groups and groups[index] or nil
	if not group then
		return { mainSocketGroup = index, error = "no socket group" }
	end
	local gems = {}
	for _, gem in ipairs(group.gemList or {}) do
		gems[#gems + 1] = {
			nameSpec = gem.nameSpec,
			skillId = gem.skillId,
			gemId = gem.gemId,
			level = gem.level,
			quality = gem.quality,
			enabled = gem.enabled,
		}
	end
	local display = group.displaySkillList and group.displaySkillList[group.mainActiveSkill] or nil
	local effect = display and display.activeEffect or nil
	local granted = effect and effect.grantedEffect or nil
	local active = effect and effect.srcInstance or nil
	local statSetIndex = effect and effect.statSet and effect.statSet.index or 1
	local statSet = granted and granted.statSets and granted.statSets[statSetIndex] or nil
	local mainSkill = current.calcsTab
		and current.calcsTab.mainEnv
		and current.calcsTab.mainEnv.player
		and current.calcsTab.mainEnv.player.mainSkill
		or nil
	local supports = {}
	if mainSkill and type(mainSkill.supportList) == "table" then
		for _, support in ipairs(mainSkill.supportList) do
			local supportName = support.grantedEffect and support.grantedEffect.name or nil
			supports[#supports + 1] = supportName or "support"
		end
	end
	return {
		mainSocketGroup = index,
		groupLabel = group.label,
		enabled = group.enabled,
		mainActiveSkill = group.mainActiveSkill,
		gems = gems,
		displayName = granted and granted.name or nil,
		effectId = granted and granted.id or nil,
		sourceGemName = active and active.nameSpec or nil,
		sourceSkillId = active and active.skillId or nil,
		skillTypes = skillTypeNames(
			(mainSkill and mainSkill.skillTypes) or (granted and granted.skillTypes) or nil
		),
		baseFlags = flagNames(
			(mainSkill and mainSkill.skillFlags) or (statSet and statSet.baseFlags) or nil
		),
		supports = supports,
	}
end

local function nodeInfo(spec, id)
	local node = spec.nodes and spec.nodes[id] or nil
	if not node then
		return { id = id, present = false }
	end
	return {
		id = node.id,
		present = true,
		name = node.name,
		type = node.type,
		alloc = node.alloc == true,
		allocMode = node.allocMode,
		ascendancyName = node.ascendancyName,
	}
end

local function classInfo(current)
	local spec = current.spec
	local info = {
		treeVersion = spec and spec.treeVersion or nil,
		classId = spec and spec.curClassId or nil,
		ascendClassId = spec and spec.curAscendClassId or nil,
		targetVersion = current.targetVersion,
	}
	local tree = spec and main.tree and main.tree[spec.treeVersion] or nil
	local class = tree and tree.classes and tree.classes[spec.curClassId] or nil
	if class then
		info.className = class.name
		local ascend = class.classes and class.classes[spec.curAscendClassId] or nil
		info.ascendancyName = ascend and ascend.name or nil
	end
	if spec and spec.CountAllocNodes then
		local used, ascUsed, _, _, weaponSet1, weaponSet2 = spec:CountAllocNodes()
		info.allocatedCount = used
		info.ascendancyAllocatedCount = ascUsed
		info.weaponSet1Count = weaponSet1
		info.weaponSet2Count = weaponSet2
	end
	return info
end

local function configSnapshot(current)
	local input = current.configTab and current.configTab.input or {}
	local rows = {}
	for key, value in pairs(input) do
		local kind = type(value)
		if kind == "string" or kind == "number" or kind == "boolean" then
			rows[#rows + 1] = { key = tostring(key), value = value }
		end
	end
	table.sort(rows, function(left, right) return left.key < right.key end)
	return rows
end

local function neighbor(spec)
	for _, node in pairs(spec.allocNodes or {}) do
		for _, linked in ipairs(node.linked or {}) do
			if not linked.alloc and not linked.ascendancyName and linked.path then
				return linked
			end
		end
	end
	return nil
end

local function secondNeighbor(spec, skipId)
	for _, node in pairs(spec.allocNodes or {}) do
		for _, linked in ipairs(node.linked or {}) do
			if linked.id ~= skipId and not linked.alloc and not linked.ascendancyName and linked.path then
				return linked
			end
		end
	end
	return nil
end

local function loadCase(current, name)
	local path = caseDir .. "\\" .. name .. ".xml"
	local handle = io.open(path, "r")
	if not handle then
		return nil, "missing " .. path
	end
	local xml = handle:read("*a")
	handle:close()
	local elapsed, ok, err = timed(function()
		current:Shutdown()
		current:Init(nil, "Spike " .. name, xml)
	end)
	if not ok then
		return nil, tostring(err)
	end
	if not current.calcsTab or not current.calcsTab.mainOutput then
		return nil, "calculation output was not built"
	end
	return {
		loadMs = elapsed,
		metrics = metricsOf(current),
		skill = skillSnapshot(current),
		classInfo = classInfo(current),
		nodes = (function()
			local rows = {}
			for _, id in ipairs(NODE_IDS) do
				rows[#rows + 1] = nodeInfo(current.spec, id)
			end
			return rows
		end)(),
		configuration = configSnapshot(current),
		memoryKb = collectgarbage("count"),
	}, nil, elapsed
end

local report = {
	ok = false,
	pobVersion = launch and launch.versionNumber or nil,
	pobBranch = launch and launch.versionBranch or nil,
	pobPlatform = launch and launch.versionPlatform or nil,
	cases = {},
}

local ok, err = pcall(function()
	local order = { "B", "C", "E", "F" }
	for _, name in ipairs(order) do
		local loaded, loadErr = loadCase(build, name)
		report.cases[name] = loaded or { error = loadErr }
	end

	local repeatB, repeatErr = loadCase(build, "B")
	report.reloadB = repeatB or { error = repeatErr }
	report.stateIsolation = {
		bMatchesReload = report.cases.B.metrics ~= nil
			and repeatB ~= nil
			and sameMetrics(report.cases.B.metrics, repeatB.metrics),
	}

	local baseCase = report.cases.B.error and report.cases.C or report.cases.B
	local mutationName = report.cases.B.error and "C" or "B"
	if not baseCase.error then
		loadCase(build, mutationName)
		local spec = build.spec
		local undo = spec:CreateUndoState()
		local baseline = metricsOf(build)
		local first = neighbor(spec)
		local passive = { feasible = false }
		if first then
			local elapsed, allocOk, allocErr = timed(function()
				spec:AllocNode(first)
				build.calcsTab:BuildOutput()
			end)
			local after = metricsOf(build)
			passive = {
				feasible = allocOk and first.alloc == true,
				nodeId = first.id,
				nodeName = first.name,
				allocMode = first.allocMode,
				elapsedMs = elapsed,
				error = allocOk and nil or tostring(allocErr),
				delta = deltaMetrics(baseline, after),
			}
			local second = secondNeighbor(spec, first.id)
			if second then
				local multiElapsed, multiOk = timed(function()
					spec:AllocNode(second)
					build.calcsTab:BuildOutput()
				end)
				passive.secondNodeId = second.id
				passive.secondNodeName = second.name
				passive.multiElapsedMs = multiElapsed
				passive.multiAllocated = multiOk and second.alloc == true
				passive.multiDelta = deltaMetrics(baseline, metricsOf(build))
			end
			local _, restoreOk, restoreErr = timed(function()
				spec:RestoreUndoState(undo, spec.treeVersion)
				build.calcsTab:BuildOutput()
			end)
			passive.restored = restoreOk and sameMetrics(baseline, metricsOf(build))
			passive.restoreError = restoreOk and nil or tostring(restoreErr)
		else
			passive.error = "no connected unallocated node"
		end
		report.passiveMutation = passive

		local repeatElapsed = {}
		for trial = 1, 5 do
			local elapsed = timed(function()
				build.calcsTab:BuildOutput()
			end)
			repeatElapsed[trial] = elapsed
		end
		report.determinism = {
			stable = sameMetrics(baseline, metricsOf(build)),
			recalcMs = repeatElapsed,
		}

		local weapon = { inspected = true }
		local weaponNode = neighbor(spec)
		if weaponNode then
			local weaponUndo = spec:CreateUndoState()
			spec.allocMode = 1
			spec:AllocNode(weaponNode)
			weapon.allocModeBefore = 0
			weapon.requestedAllocMode = spec.allocMode
			weapon.nodeAllocMode = weaponNode.allocMode
			weapon.nodeId = weaponNode.id
			spec:RestoreUndoState(weaponUndo, spec.treeVersion)
			spec.allocMode = 0
			build.calcsTab:BuildOutput()
			weapon.restored = sameMetrics(baseline, metricsOf(build))
		end
		report.weaponSet = weapon

		local group = build.skillsTab.socketGroupList[build.mainSocketGroup]
		local gem = group and group.gemList and group.gemList[1] or nil
		if gem and type(gem.level) == "number" then
			local original = gem.level
			gem.level = original + 1
			local elapsed, skillOk, skillErr = timed(function()
				build.skillsTab:ProcessSocketGroup(group)
				build.calcsTab:BuildOutput()
			end)
			local changed = not sameMetrics(baseline, metricsOf(build))
			gem.level = original
			build.skillsTab:ProcessSocketGroup(group)
			build.calcsTab:BuildOutput()
			report.skillMutation = {
				feasible = skillOk,
				gem = gem.nameSpec,
				fromLevel = original,
				toLevel = original + 1,
				elapsedMs = elapsed,
				metricsChanged = changed,
				restored = sameMetrics(baseline, metricsOf(build)),
				error = skillOk and nil or tostring(skillErr),
			}
		end
	end

	if report.cases.F and not report.cases.F.error then
		loadCase(build, "F")
		local before = metricsOf(build)
		local slot = build.itemsTab and build.itemsTab.slots and build.itemsTab.slots["Helmet"] or nil
		if slot then
			local previousId = slot.selItemId
			local raw = table.concat({
				"Rarity: RARE",
				"Spike Helm",
				"Wrapped Greathelm",
				"Armour: 40",
				"Quality: 0",
				"LevelReq: 16",
				"Implicits: 0",
				"+80 to maximum Life",
			}, "\n")
			local elapsed, itemOk, itemErr = timed(function()
				local item = new("Item", raw)
				build.itemsTab:AddItem(item, true)
				slot:SetSelItemId(item.id)
				build.calcsTab:BuildOutput()
			end)
			local after = metricsOf(build)
			slot:SetSelItemId(previousId)
			build.calcsTab:BuildOutput()
			report.itemMutation = {
				feasible = itemOk,
				slot = "Helmet",
				previousItemId = previousId,
				elapsedMs = elapsed,
				delta = deltaMetrics(before, after),
				restored = sameMetrics(before, metricsOf(build)),
				error = itemOk and nil or tostring(itemErr),
				rawAccepted = itemOk,
			}
		else
			report.itemMutation = { feasible = false, error = "helmet slot missing" }
		end
	end

	if report.cases.E and not report.cases.E.error then
		loadCase(build, "E")
		local before = metricsOf(build)
		local input = build.configTab.input
		local original = input.conditionFullLife
		input.conditionFullLife = not original
		local elapsed, configOk, configErr = timed(function()
			build.calcsTab:BuildOutput()
		end)
		local toggled = metricsOf(build)
		input.conditionFullLife = original
		local originalMods = input.customMods
		input.customMods = ""
		build.calcsTab:BuildOutput()
		local cleared = metricsOf(build)
		input.customMods = originalMods
		build.calcsTab:BuildOutput()
		report.configuration = {
			feasible = configOk,
			conditionFullLifeBefore = original,
			toggleElapsedMs = elapsed,
			toggleChangedMetrics = not sameMetrics(before, toggled),
			clearingCustomModsChangedMetrics = not sameMetrics(before, cleared),
			restored = sameMetrics(before, metricsOf(build)),
			error = configOk and nil or tostring(configErr),
		}
	end

	report.ok = true
end)

if not ok then
	report.ok = false
	report.error = tostring(err)
end

writeReport(report)
