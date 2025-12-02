import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, DollarSign, Percent, TrendingUp } from "lucide-react";

interface CommissionCalculatorProps {
  defaultPrice?: number;
}

const CommissionCalculator = ({ defaultPrice = 0 }: CommissionCalculatorProps) => {
  const [propertyPrice, setPropertyPrice] = useState(defaultPrice);
  const [commissionRate, setCommissionRate] = useState(2);
  const [commission, setCommission] = useState(0);

  useEffect(() => {
    setPropertyPrice(defaultPrice);
  }, [defaultPrice]);

  useEffect(() => {
    const calculatedCommission = (propertyPrice * commissionRate) / 100;
    setCommission(calculatedCommission);
  }, [propertyPrice, commissionRate]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5" />
          Commission Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Property Price
          </Label>
          <Input
            type="number"
            value={propertyPrice}
            onChange={(e) => setPropertyPrice(Number(e.target.value))}
            placeholder="Enter property price"
          />
          <p className="text-sm text-muted-foreground">
            {formatCurrency(propertyPrice)}
          </p>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Commission Rate: {commissionRate}%
          </Label>
          <Slider
            value={[commissionRate]}
            onValueChange={(value) => setCommissionRate(value[0])}
            min={0.5}
            max={5}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5%</span>
            <span>2.5%</span>
            <span>5%</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Potential Earnings</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(commission)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on {commissionRate}% commission on {formatCurrency(propertyPrice)} property
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[1, 2, 3].map((rate) => (
            <button
              key={rate}
              onClick={() => setCommissionRate(rate)}
              className={`p-2 rounded-lg border text-sm transition-colors ${
                commissionRate === rate
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              <div className="font-medium">{rate}%</div>
              <div className="text-xs opacity-70">
                {formatCurrency((propertyPrice * rate) / 100)}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionCalculator;