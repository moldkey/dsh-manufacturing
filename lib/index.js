/**
 * dsh-manufacturing — 制造工艺选择与工具地图（套装入口）
 */

export const name = "dsh-manufacturing";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

const TOOLS_MAP = [
  ["dsh-sheetmetal", "钣金展开/DFM：折弯 BA/BD、多段展开"],
  ["dsh-packing-list", "装箱单：估箱、体积重、计费重"],
  ["dsh-injection-molding", "注塑 DFM 与缩水率"],
  ["dsh-cnc", "CNC 转速进给与可加工性"],
  ["dsh-hs-code", "HS 编码查询与归类提示"],
  ["dsh-welding", "焊接参数与缺陷排查"],
  ["dsh-tolerance", "公差链、配合、粗糙度"],
  ["dsh-material", "材料性能与选材"],
  ["dsh-mold", "模具选型与成本"],
  ["dsh-die-casting", "压铸 DFM 与缺陷"],
  ["dsh-dfm", "DFM 清单与报价准备"],
  ["dsh-bom", "BOM 解析与报价"],
  ["dsh-stamping", "冲压力与冲压 DFM"],
  ["dsh-qc", "抽检方案与质检清单"],
];

function n(v, d) { const x = Number(v); return Number.isFinite(x) ? x : d; }

const TOOLS = {
  manufacturing_process_select: {
    description: "工艺选择：按材料、数量、尺寸、精度推荐 CNC/钣金/注塑/压铸/3D 打印",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        material: { type: "string", enum: ["metal", "plastic"], description: "材料大类" },
        quantity: { type: "number", description: "数量" },
        size_cm: { type: "number", description: "最大外形尺寸 cm" },
        precision: { type: "string", enum: ["general", "precision", "high"], description: "精度" },
      },
      required: ["material", "quantity"],
    },
    run(args) {
      const mat = String(args.material || "metal");
      const q = n(args.quantity, 0);
      const size = n(args.size_cm, 10);
      const prec = String(args.precision || "general");
      if (q <= 0) throw new Error("数量必须大于 0");
      const cands = [];
      if (mat === "metal") {
        if (q < 50) cands.push(["CNC 加工", "无需模具，单件成本高但交期快"]);
        if (q >= 50 && size < 200) cands.push(["钣金", "薄板结构件，折弯+焊接"]);
        if (q >= 1000) cands.push(["冲压", "大批量薄板件，模具摊销后单价低"]);
        if (q >= 2000) cands.push(["压铸", "铝合金/锌合金大批量"]);
        if (q >= 5000 && prec === "general") cands.push(["锻造/型材", "结构件大批量"]);
      } else {
        if (q < 100) cands.push(["3D 打印", "手板/小批量，免模具"]);
        if (q >= 100) cands.push(["注塑", "塑料件批量，需模具"]);
        if (q >= 10000) cands.push(["注塑（多腔/热流道）", "大批量摊薄模具"]);
      }
      if (!cands.length) cands.push(["CNC/3D 打印", "小批量通用"]);
      const lines = ["工艺选择", "=".repeat(52), "材料: " + mat, "数量: " + q, "尺寸: " + size + " cm", "精度: " + prec, ""];
      lines.push("推荐:");
      cands.forEach((c) => lines.push("- " + c[0] + "：" + c[1]));
      lines.push("");
      lines.push("进一步用对应工具算参数：dfm / bom / qc / tolerance / mold。");
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
  manufacturing_tool_map: {
    description: "制造工具地图：列出本套装 14 个工具的用途与安装命令",
    parameters: { type: "object", additionalProperties: false, properties: {}, required: [] },
    run() {
      const lines = ["制造工具地图（14 个）", "=".repeat(52)];
      for (const t of TOOLS_MAP) lines.push(t[0] + " — " + t[1] + NL + "  dsh plugin --profile web add github:moldkey/" + t[0]);
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
};

export function apply(ctx, config) {
  void config;
  for (const name of Object.keys(TOOLS)) {
    const t = TOOLS[name];
    ctx.tools.register({
      name: name,
      description: t.description,
      parameters: t.parameters,
      output: TEXT_OUTPUT,
      async execute(args) { try { return { text: t.run(args || {}) }; } catch (e) { return { text: "处理失败: " + String((e && e.message) || e) }; } },
    });
  }
}
