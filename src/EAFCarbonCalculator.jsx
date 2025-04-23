import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button } from "./components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import domtoimage from "dom-to-image";
import jsPDF from "jspdf";

const COLORS = ["#00c9ff", "#92fe9d", "#ffc658", "#ff8042", "#8dd1e1", "#d0ed57", "#a4de6c", "#d88884"];

const factors = {
  "天然气": { unit: "Nm³/t", factor: 0.0021650152 * 10000 },
  "铁水、生铁": { unit: "kg/t", factor: 1.73932 * 10000 },
  "石灰": { unit: "kg/t", factor: 1.023711 * 10 },
  "轻烧白云石": { unit: "kg/t", factor: 1.023711 * 10 },
  "废钢": { unit: "t/t", factor: 0.0154 * 1000 },
  "电极": { unit: "kg/t", factor: 3.663 * 10 },
  "增碳剂、碳粉": { unit: "kg/t", factor: 3.6667 * 10 },
  "合金": { unit: "kg/t", factor: 0.275 * 10 },
  "电力": { unit: "kWh/t", factor: 0.5568 * 10 },
  "蒸汽回收": { unit: "kg/t", factor: 0.00011 * -100 / 0.00275 },
  "钢坯": { unit: "t/t", factor: 0.0154 * 1000 }
};

export default function EAFCarbonCalculator() {
  const [capacity, setCapacity] = useState(100);
  const [cycle, setCycle] = useState(60);
  const [days, setDays] = useState(320);
  const [steelRatio, setSteelRatio] = useState(1.087);
  const [scrapRatio, setScrapRatio] = useState(0.7);
  const [intensities, setIntensities] = useState({});

  const dailyFurnaceCount = 1440 / cycle;
  const dailyOutput = capacity * dailyFurnaceCount;
  const annualOutput = dailyOutput * days / 10000;

  const ironAmount = steelRatio * (1 - scrapRatio);
  const scrapAmount = steelRatio * scrapRatio;

  const materialAmounts = Object.entries(intensities).reduce((acc, [material, intensity]) => {
    const divisor = factors[material]?.unit.includes("t") ? 1 : 1000;
    acc[material] = (intensity * annualOutput) / divisor;
    return acc;
  }, {});

  materialAmounts["铁水、生铁"] = ironAmount * annualOutput;
  materialAmounts["废钢"] = scrapAmount * annualOutput;

  const emissions = Object.entries(materialAmounts).map(([material, amount]) => {
    const factor = factors[material]?.factor || 0;
    return { name: material, value: amount * factor };
  });

  const total = emissions.reduce((sum, e) => sum + e.value, 0);
  const perTon = (total * 1000 / (annualOutput * 10000 || 1));

  const top5 = [...emissions].sort((a, b) => b.value - a.value).slice(0, 5);
  const fullPerTonEmissions = emissions.map(e => ({
    name: e.name,
    value: (e.value * 1000 / (annualOutput * 10000 || 1))
  })).sort((a, b) => b.value - a.value);
  const fullTotalEmissions = [...emissions].sort((a, b) => b.value - a.value);

  const handleInput = (material, val) => {
    const v = val === "" ? "" : parseFloat(val) || 0;
    setIntensities({ ...intensities, [material]: v });
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
      <Card className="bg-gray-800 border border-gray-600 shadow-lg rounded-2xl">
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
          <div><Label>电炉容量（吨）</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>冶炼周期（分钟）</Label><Input type="number" value={cycle} onChange={(e) => setCycle(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>年生产天数</Label><Input type="number" value={days} onChange={(e) => setDays(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>钢铁料消耗</Label><Input type="number" value={steelRatio} onChange={(e) => setSteelRatio(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>废钢比例</Label><Input type="number" step="0.01" value={scrapRatio} onChange={(e) => setScrapRatio(parseFloat(e.target.value) || 0)} /></div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border border-gray-600 shadow-lg rounded-2xl">
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
          {Object.entries(factors).map(([material, meta]) =>
            material === "铁水、生铁" || material === "废钢" ? null : (
              <div key={material}><Label>{material}（{meta.unit}）</Label>
                <Input type="number" value={intensities[material] || ""} onChange={(e) => handleInput(material, e.target.value)} />
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card id="result-card" className="bg-gray-800 border border-gray-600 shadow-xl rounded-2xl">
        <CardContent className="space-y-6 pt-6">
          <p>📌 吨钢铁水用量 = {ironAmount.toFixed(3)} 吨</p>
          <p>📌 吨钢废钢用量 = {scrapAmount.toFixed(3)} 吨</p>
          <p>📌 年产量（万吨） = {annualOutput.toFixed(4)}</p>
          <p>📌 总碳排放量：{total.toFixed(2)} 吨 CO₂</p>
          <p>📌 吨钢碳排放量：{perTon.toFixed(2)} kg CO₂/t</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-cyan-400">📊 吨钢碳排构成（前五）</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={top5} dataKey="value" cx="50%" cy="50%" outerRadius={100}>
                    {top5.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="list-disc pl-5 text-sm mt-2">
                {fullPerTonEmissions.map((e, i) => (
                  <li key={`perTon-${i}`}>{e.name}: {e.value.toFixed(3)} kg CO₂/t</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-cyan-400">📊 总碳排构成（前五）</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={top5} dataKey="value" cx="50%" cy="50%" outerRadius={100}>
                    {top5.map((entry, i) => (
                      <Cell key={`cell-total-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="list-disc pl-5 text-sm mt-2">
                {fullTotalEmissions.map((e, i) => (
                  <li key={`total-${i}`}>{e.name}: {e.value.toFixed(3)} 吨 CO₂</li>
                ))}
              </ul>
            </div>
          </div>

          <Button className="mt-6 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={exportPDF}>📄 下载 PDF 报告</Button>
        </CardContent>
      </Card>
    </div>
  );
}
