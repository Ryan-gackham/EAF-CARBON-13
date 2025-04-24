import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import domtoimage from "dom-to-image";
import jsPDF from "jspdf";

const Card = ({ children, className }) => <div className={"rounded-xl p-4 bg-white/5 shadow " + className}>{children}</div>;
const CardContent = ({ children, className }) => <div className={className}>{children}</div>;
const Input = ({ value, type = "text", onChange, step }) => <input type={type} value={value} onChange={onChange} step={step} className="w-full rounded bg-gray-700 text-white p-2" />;
const Label = ({ children }) => <label className="block text-sm mb-1 font-medium text-white">{children}</label>;
const Button = ({ children, onClick, className }) => <button onClick={onClick} className={className + " px-4 py-2 rounded"}>{children}</button>;

const COLORS = ["#00c9ff", "#92fe9d", "#ffc658", "#ff8042", "#8dd1e1", "#d0ed57", "#a4de6c", "#d88884"];

const factors = {
  "天然气": { unit: "Nm³/t", factor: 21.650 },
  "铁水、生铁": { unit: "kg/t", factor: 1.7393 },
  "石灰": { unit: "kg/t", factor: 1.0237 },
  "轻烧白云石": { unit: "kg/t", factor: 1.0237 },
  "废钢": { unit: "t/t", factor: 0.0154 },
  "电极": { unit: "kg/t", factor: 3.6630 },
  "增碳剂、碳粉": { unit: "kg/t", factor: 3.6667 },
  "电力": { unit: "kWh/t", factor: 0.00005568 },
  "蒸汽回收": { unit: "kg/t", factor: 0.00011 },
  "合金": { unit: "kg/t", factor: 0.2750 }
};

export default function EAFCarbonCalculator() {
  const [capacity, setCapacity] = useState(100);
  const [cycle, setCycle] = useState(60);
  const [days, setDays] = useState(320);
  const [steelRatio, setSteelRatio] = useState(1.087);
  const [scrapRatio, setScrapRatio] = useState(0.7);
  const [intensities, setIntensities] = useState({});
  const [factorsState, setFactorsState] = useState(() => {
    const initial = {};
    for (const key in factors) initial[key] = factors[key].factor;
    return initial;
  });

  const dailyFurnaceCount = 1440 / cycle;
  const dailyOutput = capacity * dailyFurnaceCount;
  const annualOutput = dailyOutput * days / 10000;

  const ironAmount = steelRatio * (1 - scrapRatio);
  const scrapAmount = steelRatio * scrapRatio;

  const materialAmounts = Object.entries(intensities).reduce((acc, [material, intensity]) => {
    acc[material] = intensity * annualOutput / (factors[material]?.unit.includes("t") ? 1 : 1000);
    return acc;
  }, {});
  materialAmounts["铁水、生铁"] = ironAmount * annualOutput;
  materialAmounts["废钢"] = scrapAmount * annualOutput;

  const emissions = Object.entries(materialAmounts).map(([material, amount]) => {
    const factor = factorsState[material] || 0;
    return { name: material, value: amount * factor };
  });

  const total = emissions.reduce((sum, e) => sum + e.value, 0);
  const perTon = (total * 1000 / (annualOutput * 10000 || 1));

  const fullPerTonEmissions = emissions.map(e => ({
    name: e.name,
    value: (e.value * 1000 / (annualOutput * 10000 || 1))
  })).sort((a, b) => b.value - a.value);
  const fullTotalEmissions = [...emissions].sort((a, b) => b.value - a.value);

  const handleInput = (material, val) => {
    const v = val === "" ? "" : parseFloat(val) || 0;
    setIntensities({ ...intensities, [material]: v });
  };
  const handleFactorChange = (material, val) => {
    const v = parseFloat(val) || 0;
    setFactorsState({ ...factorsState, [material]: v });
  };

  const exportPDF = () => {
    const input = document.getElementById("result-card");
    domtoimage.toPng(input).then((imgData) => {
      const pdf = new jsPDF();
      const width = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const height = (imgProps.height * width) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save("carbon-report.pdf");
    });
  };

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full border border-cyan-500" />
        <div>
          <h1 className="text-xl font-bold text-cyan-400">电弧炉智控新观察</h1>
          <p className="text-sm text-gray-300">后续会陆续更新电弧炉计算小程序</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <table className="w-full table-auto text-sm text-white">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left p-2">物料名称</th>
                <th className="text-left p-2">排放因子</th>
                <th className="text-left p-2">吨钢消耗量（单位）</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(factors).map(([material, meta]) => (
                <tr key={material} className="border-b border-gray-800">
                  <td className="p-2">{material}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={factorsState[material]}
                      onChange={(e) => handleFactorChange(material, e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    {material === "废钢" || material === "铁水、生铁" ? (
                      <span className="text-gray-500">自动计算</span>
                    ) : (
                      <Input
                        type="number"
                        value={intensities[material] || ""}
                        onChange={(e) => handleInput(material, e.target.value)}
                      />
                    )}
                    <span className="ml-2 text-gray-400">{meta.unit}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card id="result-card">
          <CardContent>
            <h2 className="text-xl font-semibold text-cyan-400 mb-4">📊 吨钢碳排放构成</h2>
            <h4 className="text-md mb-2 text-white">吨钢碳排放总量：{perTon.toFixed(2)} kg CO₂/t</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie dataKey="value" data={fullPerTonEmissions} outerRadius={80} label>
                  {fullPerTonEmissions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-2 text-sm text-gray-200">
              {fullPerTonEmissions.map((e, i) => (
                <li key={i}>{e.name}：{e.value.toFixed(3)} kg CO₂/t</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-cyan-400 mb-4">📊 总碳排放构成</h2>
            <h4 className="text-md mb-2 text-white">总碳排放量：{total.toFixed(2)} 吨 CO₂</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie dataKey="value" data={fullTotalEmissions} outerRadius={80} label>
                  {fullTotalEmissions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-2 text-sm text-gray-200">
              {fullTotalEmissions.map((e, i) => (
                <li key={i}>{e.name}：{(e.value).toFixed(2)} 吨 CO₂</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={exportPDF} className="bg-cyan-600 hover:bg-cyan-500 text-white">📄 下载 PDF 报告</Button>
      </div>
    </div>
  );
}
