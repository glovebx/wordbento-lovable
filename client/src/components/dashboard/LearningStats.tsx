import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLearningStats, LearningStatsData } from '@/hooks/use-learning-stats';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Users, BarChart2, Home } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const LearningCurveChart = ({ data }: { data: LearningStatsData['dailyCounts'] }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} name="Words Learned" />
            </LineChart>
        </ResponsiveContainer>
    );
};

const LearningStats: React.FC = () => {
    const [days, setDays] = useState<7 | 15 | 30>(7);
    const { stats, isLoading, error, fetchStats } = useLearningStats();

    React.useEffect(() => {
        fetchStats(days);
    }, [days, fetchStats]);

    if (isLoading || !stats) {
        return <div className="flex justify-center items-center h-full p-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 py-10 p-6">Error: {error}</div>;
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex justify-end">
                <Button variant="outline" asChild>
                    <Link to="/" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Back to Home
                    </Link>
                </Button>
            </div>

            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard title="Today's Words" value={stats.today} icon={<BarChart2 className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Yesterday's Words" value={stats.yesterday} icon={<BarChart2 className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Your Rank" value={`${stats.rank} / ${stats.totalUsers}`} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Learning Curve</CardTitle>
                        <div className="space-x-2">
                            <Button variant={days === 7 ? 'secondary' : 'outline'} onClick={() => setDays(7)}>7 Days</Button>
                            <Button variant={days === 15 ? 'secondary' : 'outline'} onClick={() => setDays(15)}>15 Days</Button>
                            <Button variant={days === 30 ? 'secondary' : 'outline'} onClick={() => setDays(30)}>30 Days</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <LearningCurveChart data={stats.dailyCounts} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LearningStats;
