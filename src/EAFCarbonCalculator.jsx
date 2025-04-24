import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import domtoimage from "dom-to-image";
import jsPDF from "jspdf";

// Enhanced card style for industrial theme
const Card = ({ children, className }) => (
  <div className={"rounded-xl p-4 bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl border border-cyan-600 " + className}>{children}</div>
);
const CardContent = ({ children, className }) => <div className={className}>{children}</div>;
const Input = ({ value, type = "text", onChange, step }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    step={step}
    className="w-full rounded bg-slate-700 text-cyan-100 p-2 border border-cyan-500 focus:outline-none"
  />
);
const Label = ({ children }) => <label className="block text-xs mb-1 font-semibold text-cyan-300 uppercase tracking-wide">{children}</label>;
const Button = ({ children, onClick, className }) => (
  <button onClick={onClick} className={className + " px-4 py-2 rounded border border-cyan-500 bg-cyan-600 hover:bg-cyan-500 text-white transition"}>{children}</button>
);

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
    <div className="p-6 space-y-8 bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white min-h-screen font-mono">
      <div className="flex items-center gap-4">
        <img src="/9de4ca8c-ecd6-40cd-b428-5407e1f84553.png" alt="公众号LOGO" className="h-16 w-16 rounded-full border border-cyan-500" />
        <h1 className="text-2xl font-bold text-cyan-300">电弧炉智控新观察</h1>
      </div>
      <p className="text-sm text-cyan-400">⚙️ 后续将陆续发布电弧炉碳排放计算小程序的系列更新与实用指南。</p>

      {/* 原有表单和图表代码保持不变 */}

      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
          <div><Label>电炉容量（吨）</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>冶炼周期（分钟）</Label><Input type="number" value={cycle} onChange={(e) => setCycle(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>年生产天数</Label><Input type="number" value={days} onChange={(e) => setDays(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>钢铁料消耗</Label><Input type="number" value={steelRatio} onChange={(e) => setSteelRatio(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>废钢比例</Label><Input type="number" step="0.01" value={scrapRatio} onChange={(e) => setScrapRatio(parseFloat(e.target.value) || 0)} /></div>
        </CardContent>
      </Card>
      {/* 以下保持原结构继续展示计算结果 */}
    </div>
  );
}
