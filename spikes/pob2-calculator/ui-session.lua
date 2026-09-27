-- Leaves the PoB2 window open so a screenshot can read the sidebar.
-- A later mouse click allocates node 4739 through the tree view.

local build = ...
local outDir = os.getenv("POB2_SPIKE_DIR")
local caseName = os.getenv("POB2_SPIKE_CASE") or "B"

local function jsonEscape(value)
	return (tostring(value)
		:gsub("\\", "\\\\")
		:gsub("\"", "\\\"")
		:gsub("\r", "\\r")
		:gsub("\n", "\\n"))
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
	local count = 0
	local array = true
	for key in pairs(value) do
		if type(key) ~= "number" then
			array = false
			break
		end
		count = count + 1
	end
	if array and count == #value then
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

local function writeJson(name, value)
	local handle = io.open(outDir .. "\\" .. name, "w")
	if not handle then
		return
	end
	handle:write(encode(value))
	handle:close()
end

local function fileExists(name)
	local handle = io.open(outDir .. "\\" .. name, "r")
	if not handle then
		return false
	end
	handle:close()
	return true
end

local function stripColor(text)
	return (text
		:gsub("%^x%x%x%x%x%x%x", "")
		:gsub("%^%d", "")
		:gsub("%^%a", ""))
end

local function sidebarLines(current)
	local lines = {}
	local list = current.controls and current.controls.statBox and current.controls.statBox.list or {}
	for _, row in ipairs(list) do
		local parts = {}
		for index = 1, #row do
			if type(row[index]) == "string" then
				parts[#parts + 1] = stripColor(row[index])
			end
		end
		if #parts > 0 then
			lines[#lines + 1] = table.concat(parts, " ")
		end
	end
	return lines
end

local function selectedSkill(current)
	local index = current.mainSocketGroup
	local group = current.skillsTab and current.skillsTab.socketGroupList and current.skillsTab.socketGroupList[index] or nil
	local display = group and group.displaySkillList and group.displaySkillList[group.mainActiveSkill] or nil
	local granted = display and display.activeEffect and display.activeEffect.grantedEffect or nil
	return granted and granted.name or nil
end

local function snapshot(current, extra)
	local output = current.calcsTab and current.calcsTab.mainOutput or {}
	local row = {
		case = caseName,
		skill = selectedSkill(current),
		sidebar = sidebarLines(current),
		life = output.Life,
		energyShield = output.EnergyShield,
		armour = output.Armour,
		averageHit = output.AverageHit,
		averageDamage = output.AverageDamage,
		totalDps = output.TotalDPS,
		critChance = output.CritChance,
		speed = output.Speed,
		castRate = output.CastRate,
		fireResist = output.FireResist,
		totalEhp = output.TotalEHP,
		node4739Alloc = current.spec and current.spec.nodes and current.spec.nodes[4739] and current.spec.nodes[4739].alloc == true or false,
	}
	for key, value in pairs(extra or {}) do
		row[key] = value
	end
	return row
end

local function measureNode(current)
	local viewer = current.treeTab and current.treeTab.viewer or nil
	local node = current.spec and current.spec.nodes and current.spec.nodes[4739] or nil
	local tree = current.spec and current.spec.tree or nil
	if not viewer or not node or not tree or not node.x or not node.y then
		return { onScreen = false }
	end
	local tabX = 312
	local tabY = 32
	local tabW = main.screenW - tabX
	local tabH = main.screenH - tabY
	local footer = 32
	if current.treeTab.showConvert then
		footer = 64
	end
	local powerList = current.treeTab.controls and current.treeTab.controls.powerReportList or nil
	if powerList and powerList.shown then
		footer = footer + 194
	end
	local treeW = tabW
	local treeH = tabH - footer
	viewer.zoomLevel = 15
	viewer.zoom = 1.2 ^ viewer.zoomLevel
	local scale = math.min(treeW, treeH) / tree.size * viewer.zoom
	viewer.zoomX = -node.x * scale
	viewer.zoomY = -node.y * scale
	local sx = tabX + treeW / 2
	local sy = tabY + treeH / 2
	return {
		onScreen = sx >= tabX and sx <= main.screenW - 12 and sy >= tabY and sy <= main.screenH - 12,
		clientX = sx,
		clientY = sy,
		screenW = main.screenW,
		screenH = main.screenH,
		zoom = viewer.zoom,
	}
end

local path = outDir .. "\\" .. caseName .. ".xml"
local handle = io.open(path, "r")
if not handle then
	writeJson("ui-error.json", { ok = false, error = "missing " .. path })
	return
end
local xml = handle:read("*a")
handle:close()

build:Shutdown()
build:Init(nil, "UI " .. caseName, xml)
build.viewMode = "TREE"

local originalOnFrame = build.OnFrame
local stage = "focus"
local frames = 0
local sawAlloc = false

function build:OnFrame(...)
	if stage == "focus" then
		local node = self.spec.nodes[4739]
		if node then
			self.treeTab.jumpToX = node.x
			self.treeTab.jumpToY = node.y
			self.treeTab.jumpToNode = true
		end
		self.viewMode = "TREE"
		stage = "measure"
		frames = 0
	end
	originalOnFrame(self, ...)
	frames = frames + 1
	if stage == "measure" and frames >= 4 then
		writeJson("ui-base.json", snapshot(self, { click = measureNode(self), phase = "baseline" }))
		stage = "wait-alloc"
		frames = 0
	elseif stage == "wait-alloc" then
		local allocated = self.spec.nodes[4739] and self.spec.nodes[4739].alloc == true
		if allocated then
			sawAlloc = true
			stage = "settle-alloc"
			frames = 0
		elseif fileExists("force-alloc.flag") then
			self.spec:AllocNode(self.spec.nodes[4739])
			self.calcsTab:BuildOutput()
			self:RefreshStatList()
			stage = "settle-alloc"
			frames = 0
			_G.POB2_UI_FORCED_ALLOC = true
		end
	elseif stage == "settle-alloc" and frames >= 3 then
		writeJson("ui-alloc.json", snapshot(self, {
			phase = "allocated",
			method = _G.POB2_UI_FORCED_ALLOC and "AllocNode" or "click",
		}))
		stage = "wait-revert"
		frames = 0
	elseif stage == "wait-revert" then
		local allocated = self.spec.nodes[4739] and self.spec.nodes[4739].alloc == true
		if sawAlloc and not allocated then
			stage = "settle-revert"
			frames = 0
		elseif fileExists("force-revert.flag") then
			self.spec:DeallocNode(self.spec.nodes[4739])
			self.calcsTab:BuildOutput()
			self:RefreshStatList()
			stage = "settle-revert"
			frames = 0
			_G.POB2_UI_FORCED_REVERT = true
		end
	elseif stage == "settle-revert" and frames >= 3 then
		writeJson("ui-revert.json", snapshot(self, {
			phase = "reverted",
			method = _G.POB2_UI_FORCED_REVERT and "DeallocNode" or "click",
		}))
		stage = "done"
	end
end
