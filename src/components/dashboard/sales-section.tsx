import { getSalesTimeSeries } from "@/lib/data/sales";
import { formatCurrencyCompact } from "@/lib/format";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SalesChart } from "@/components/dashboard/sales-chart";

export async function SalesSection() {
  const series = await getSalesTimeSeries();

  const yearlyRevenue = series.reduce((sum, point) => sum + point.revenue, 0);
  const yearlySales = series.reduce((sum, point) => sum + point.sales, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Satış Performansı</CardTitle>
        <CardDescription>
          Son 12 ayda kapanan {yearlySales} işlemin aylık cirosu
        </CardDescription>
        <CardAction>
          <div className="text-right">
            <p className="text-[17px] font-semibold tabular-nums text-foreground">
              {formatCurrencyCompact(yearlyRevenue)}
            </p>
            <p className="text-[11.5px] text-muted-foreground">12 aylık toplam</p>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <SalesChart data={series} />
      </CardContent>
    </Card>
  );
}
