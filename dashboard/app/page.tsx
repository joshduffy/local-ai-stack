import { StatusCards } from '@/components/dashboard/StatusCards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ModelsList } from '@/components/dashboard/ModelsList';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your local AI infrastructure
        </p>
      </div>

      <StatusCards />

      <div className="grid gap-6 lg:grid-cols-2">
        <QuickActions />
        <ModelsList />
      </div>
    </div>
  );
}
