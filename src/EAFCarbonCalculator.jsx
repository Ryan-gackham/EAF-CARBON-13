import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button } from "./components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import domtoimage from "dom-to-image";
import jsPDF from "jspdf";

const emissionFactors = {
  "天然气": { unit: "Nm³/t", factor: 0.0021650152 },
  "铁水、生铁": { unit: "kg/t", factor: 1.73932 },
  "石灰": { unit: "kg/t", factor: 1.023711 },
  "轻烧白云石": { unit: "kg/t", factor: 1.023711 },
  "废钢": { unit: "t/t", factor: 0.0154 },
  "电极": { unit: "kg/t", factor: 3.663 },
  "增碳剂、碳粉": { unit: "kg/t", factor: 3.6667 },
  "电力": { unit: "kWh/t", factor: 0.000557 },
  "蒸汽回收": { unit: "kg/t", factor: 0.110 },
  "合金": { unit: "kg/t", factor: 0.275 }
};

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#d0ed57", "#a4de6c", "#d88884"];

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

  const materialAmounts = Object.entries(intensities).reduce((acc, [material, intensity]) => {
    const divisor = emissionFactors[material]?.unit.includes("t") ? 1 : 1000;
    const adjustedIntensity = material === "蒸汽回收" ? intensity * 0.0026 : intensity;
    acc[material] = (adjustedIntensity * annualOutput) / divisor;
    return acc;
  }, {});

  const ironAmount = 1.087 * (1 - scrapRatio);
  const scrapAmount = 1.087 * scrapRatio;
  materialAmounts["铁水、生铁"] = ironAmount * annualOutput;
  materialAmounts["废钢"] = scrapAmount * annualOutput;

  const emissions = Object.entries(materialAmounts).map(([material, amount]) => {
    const factor = emissionFactors[material]?.factor || 0;
    return { name: material, value: amount * factor, raw: amount };
  });

  const total = emissions.reduce((sum, e) => sum + e.value, 0);
  const emissionsTop5 = [...emissions].sort((a, b) => b.value - a.value).slice(0, 5);

  const handleInput = (material, value) => {
    const val = value === '' ? '' : parseFloat(value) || 0;
    setIntensities({ ...intensities, [material]: val });
  };

  const exportPDF = () => {
    const input = document.getElementById("result-card");
    domtoimage.toPng(input).then((imgData) => {
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("carbon-report.pdf");
    });
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div><Label>电炉工程容量（吨/炉）</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>电炉冶炼周期（分钟/炉）</Label><Input type="number" value={cycle} onChange={(e) => setCycle(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>年生产天数</Label><Input type="number" value={days} onChange={(e) => setDays(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>钢铁料消耗（默认1.087）</Label><Input type="number" value={steelRatio} onChange={(e) => setSteelRatio(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>废钢比例</Label><Input type="number" step="0.01" value={scrapRatio} onChange={(e) => setScrapRatio(parseFloat(e.target.value) || 0)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          {Object.entries(emissionFactors).map(([material, meta]) => (
            material === "废钢" || material === "铁水、生铁" ? null : (
              <div key={material}>
                <Label>{material}（{meta.unit}）</Label>
                <Input type="number" min="0" value={intensities[material] || ""} onChange={(e) => handleInput(material, e.target.value)} />
              </div>
            )
          ))}
        </CardContent>
      </Card>

      <Card id="result-card">
        <CardContent className="space-y-2 pt-4">
          <p>📌 日生产炉数 = 1440 / 冶炼周期 = {dailyFurnaceCount.toFixed(2)}</p>
          <p>📌 日产量（吨） = 电炉容量 × 日生产炉数 = {capacity} × {dailyFurnaceCount.toFixed(2)} = {dailyOutput.toFixed(2)}</p>
          <p>📌 年产量（万吨） = 日产量 × 生产天数 / 10000 = {dailyOutput.toFixed(2)} × {days} / 10000 = {annualOutput.toFixed(4)}</p>
          <p>📌 总碳排放量：{total.toFixed(2)} 吨 CO₂</p>
          <p>📌 吨钢碳排放量：{(total * 10000 / (annualOutput || 1)).toFixed(3)} kg CO₂/t</p>
          <div className="text-sm pt-2">
            <p>📋 各项排放明细：</p>
            <ul className="list-disc pl-5">
              {emissions.map((e, i) => (
                <li key={i}>{e.name}: {e.value.toFixed(3)} 吨 CO₂</li>
              ))}
            </ul>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie dataKey="value" data={emissionsTop5} cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${Math.round(value)}` }>
                {emissionsTop5.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <Button onClick={exportPDF}>导出 PDF 报告</Button>
        </CardContent>
      </Card>
    </div>
  );
}
