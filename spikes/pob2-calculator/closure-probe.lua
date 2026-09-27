-- Research probe for STEP-018A.1. Loaded only when POB2_SPIKE_SCRIPT points here.
-- It does not change production code.

local build = ...
local outPath = os.getenv("POB2_SPIKE_OUT")
local caseDir = os.getenv("POB2_SPIKE_DIR")

local LOOKUP_IDS = { 54447, 4739, 18845, 1755, 22419, 6686, 17788, 2254, 32699 }

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

local function numericMap(output)
	local found = {}
	if type(output) ~= "table" then
		return found
	end
	for key, value in pairs(output) do
		if type(key) == "string" and type(value) == "number" then
			found[key] = value
		end
	end
	return found
end

local function metricsOf(current)
	return numericMap(current.calcsTab and current.calcsTab.mainOutput or nil)
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

local function supportNames(current)
	local names = {}
	local mainSkill = current.calcsTab
		and current.calcsTab.mainEnv
		and current.calcsTab.mainEnv.player
		and current.calcsTab.mainEnv.player.mainSkill
		or nil
	if mainSkill and type(mainSkill.supportList) == "table" then
		for _, support in ipairs(mainSkill.supportList) do
			names[#names + 1] = support.grantedEffect and support.grantedEffect.name or "support"
		end
	end
	return names
end

local function nodeRow(spec, id)
	local node = spec and spec.nodes and spec.nodes[id] or nil
	if not node then
		return { id = id, present = false }
	end
	return {
		id = node.id,
		present = true,
		name = node.name,
		type = node.type,
		alloc = node.alloc == true,
		allocMode = node.allocMode or 0,
		ascendancyName = node.ascendancyName,
		isNotable = node.type == "Notable",
	}
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
		current:Init(nil, "Closure " .. name, xml)
	end)
	if not ok then
		return nil, tostring(err)
	end
	if not current.calcsTab or not current.calcsTab.mainOutput then
		return nil, "calculation output was not built"
	end
	return elapsed, nil
end

local function findGem(current, label)
	local groups = current.skillsTab and current.skillsTab.socketGroupList or {}
	for _, group in ipairs(groups) do
		for index, gem in ipairs(group.gemList or {}) do
			if gem.nameSpec == label then
				return group, gem, index
			end
		end
	end
	return nil, nil, nil
end

local report = {
	ok = false,
	pobVersion = launch and launch.versionNumber or nil,
	pobBranch = launch and launch.versionBranch or nil,
	pobPlatform = launch and launch.versionPlatform or nil,
}

local ok, err = pcall(function()
	local loadMs, loadErr = loadCase(build, "D")
	if loadErr then
		report.fixtureD = { error = loadErr }
	else
		local rows = {}
		for _, id in ipairs(LOOKUP_IDS) do
			rows[#rows + 1] = nodeRow(build.spec, id)
		end
		report.fixtureD = {
			loadMs = loadMs,
			treeVersion = build.spec.treeVersion,
			nodes = rows,
			allocModeWasSetByProbe = false,
		}
	end

	loadMs, loadErr = loadCase(build, "C")
	if loadErr then
		report.supportMutation = { error = loadErr }
	else
		local before = metricsOf(build)
		local supportsBefore = supportNames(build)
		local group, gem = findGem(build, "Magnified Area II")
		if not gem then
			report.supportMutation = {
				executed = false,
				error = "Magnified Area II was not in the loaded socket groups",
				supportsBefore = supportsBefore,
			}
		else
			local originalEnabled = gem.enabled
			gem.enabled = false
			local elapsed, mutateOk, mutateErr = timed(function()
				build.skillsTab:ProcessSocketGroup(group)
				build.calcsTab:BuildOutput()
			end)
			local during = metricsOf(build)
			local supportsDuring = supportNames(build)
			gem.enabled = originalEnabled
			build.skillsTab:ProcessSocketGroup(group)
			build.calcsTab:BuildOutput()
			report.supportMutation = {
				executed = mutateOk,
				support = gem.nameSpec,
				gemId = gem.gemId,
				method = "gem.enabled = false, ProcessSocketGroup, BuildOutput",
				elapsedMs = elapsed,
				supportsBefore = supportsBefore,
				supportsDuring = supportsDuring,
				delta = deltaMetrics(before, during),
				restored = sameMetrics(before, metricsOf(build)),
				supportsRestored = encode(supportNames(build)) == encode(supportsBefore),
			}
			if not mutateOk then
				report.supportMutation.error = tostring(mutateErr)
			end
		end
	end

	loadMs, loadErr = loadCase(build, "B")
	if loadErr then
		report.configurationEffect = { error = loadErr }
	else
		local before = metricsOf(build)
		local input = build.configTab.input
		local originalMods = input.customMods
		local trials = {
			"10% increased Cast Speed",
			"+30 to maximum Life",
		}
		local attempts = {}
		for _, line in ipairs(trials) do
			local parsed, extra = modLib.parseMod(line)
			local accepted = parsed ~= nil and extra == nil
			input.customMods = line
			local elapsed, configOk, configErr = timed(function()
				build.configTab:BuildModList()
				build.calcsTab:BuildOutput()
			end)
			local after = metricsOf(build)
			local delta = deltaMetrics(before, after)
			attempts[#attempts + 1] = {
				line = line,
				parseAccepted = accepted,
				elapsedMs = elapsed,
				changed = #delta > 0,
				delta = delta,
			}
			if not configOk then
				attempts[#attempts].error = tostring(configErr)
			end
			input.customMods = originalMods
			build.configTab:BuildModList()
			build.calcsTab:BuildOutput()
			if accepted and #delta > 0 then
				break
			end
		end
		report.configurationEffect = {
			originalCustomMods = originalMods,
			attempts = attempts,
			restored = sameMetrics(before, metricsOf(build)),
		}
	end

	report.ok = true
end)

if not ok then
	report.ok = false
	report.error = tostring(err)
end

writeReport(report)
