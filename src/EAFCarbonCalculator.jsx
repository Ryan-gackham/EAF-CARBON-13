import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import domtoimage from "dom-to-image";
import jsPDF from "jspdf";

const Card = ({ children, className }) => <div className={"rounded-xl p-4 bg-white/5 shadow " + className}>{children}</div>;
const CardContent = ({ children, className }) => <div className={className}>{children}</div>;
const Input = ({ value, type = "text", onChange, step }) => <input type={type} value={value} onChange={onChange} step={step} className="w-full rounded bg-gray-700 text-white p-2" />;
const Label = ({ children }) => <label className="block text-sm mb-1 font-medium text-white">{children}</label>;
const Button = ({ children, onClick, className }) => <button onClick={onClick} className={className + " px-4 py-2 rounded"}>{children}</button>;

const COLORS = ["#00c9ff", "#92fe9d", "#ffc658", "#ff8042", "#8dd1e1", "#d0ed57", "#a4de6c", "#d88884"];

const factors = {
  "天然气": { unit: "Nm³/t", factor: 21.650, multiplier: 1 },
  "铁水、生铁": { unit: "kg/t", factor: 1.7393, multiplier: 10000 },
  "石灰": { unit: "kg/t", factor: 1.0237, multiplier: 10 },
  "轻烧白云石": { unit: "kg/t", factor: 1.0237, multiplier: 10 },
  "废钢": { unit: "t/t", factor: 0.0154, multiplier: 1000 },
  "电极": { unit: "kg/t", factor: 3.6630, multiplier: 10 },
  "增碳剂、碳粉": { unit: "kg/t", factor: 3.6667, multiplier: 10 },
  "电力": { unit: "kWh/t", factor: 0.5568, multiplier: 10 },
  "蒸汽回收": { unit: "kg/t", factor: 0.11, multiplier: -0.1/0.00275 },
  "合金": { unit: "kg/t", factor: 0.2750, multiplier: 10 }
};

const energyFactors = {
  "碳粉": { unit: "t/万t钢", factor: 0.9801 },
  "焦炉煤气": { unit: "万m³/万t钢", factor: 6.43 },
  "天然气": { unit: "万m³/万t钢", factor: 12.57 },
  "电": { unit: "万kWh/万t钢", factor: 1.229 },
  "蒸汽使用": { unit: "t/万t钢", factor: 0.1057 },
  "蒸汽回收": { unit: "t/万t钢", factor: -0.1057 }
};

export default function EAFCarbonCalculator() {
  const [energyInputs, setEnergyInputs] = useState({});

  const handleEnergyInput = (key, value) => {
    setEnergyInputs({ ...energyInputs, [key]: parseFloat(value) || 0 });
  };

  const energyResults = Object.entries(energyFactors).map(([key, meta]) => {
    const input = energyInputs[key] || 0;
    const result = input * meta.factor;
    return { name: key, value: result };
  });

  const totalEnergy = energyResults.reduce((sum, item) => sum + item.value, 0);
  const perTonEnergy = totalEnergy / 10; // since base is 10,000t

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(energyFactors).map(([key, meta]) => (
            <div key={key}>
              <Label>{key}（{meta.unit}）</Label>
              <Input type="number" step="any" value={energyInputs[key] || ""} onChange={(e) => handleEnergyInput(key, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-lg font-bold text-white">能源消耗折算结果</h2>
          <ul className="text-white space-y-1">
            {energyResults.map((item) => (
              <li key={item.name}>✅ {item.name}: {item.value.toFixed(3)} tce</li>
            ))}
            <li className="mt-2 font-semibold">📌 总能耗：{totalEnergy.toFixed(3)} tce</li>
            <li className="font-semibold">📌 吨钢能耗：{perTonEnergy.toFixed(3)} tce/t</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
