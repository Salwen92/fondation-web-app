"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RepositoryList } from "@/components/repos/repository-list";
import { Card } from "@/components/ui/card";
import { 
  GitBranch, 
  FileText, 
  Activity, 
  TrendingUp,
  Sparkles,
  Clock,
  BarChart3,
  Users
} from "lucide-react";
import { motion } from "framer-motion";

interface DashboardContentProps {
  githubId: string;
  userName?: string | null;
}

const stats = [
  {
    title: "Total Repositories",
    value: "12",
    change: "+2 this week",
    icon: <GitBranch className="h-5 w-5" />,
    gradient: "from-purple-500 to-pink-500"
  },
  {
    title: "Docs Generated",
    value: "8",
    change: "+5 this month",
    icon: <FileText className="h-5 w-5" />,
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    title: "Active Jobs",
    value: "3",
    change: "Processing",
    icon: <Activity className="h-5 w-5" />,
    gradient: "from-green-500 to-emerald-500"
  },
  {
    title: "Success Rate",
    value: "99.8%",
    change: "+0.3%",
    icon: <TrendingUp className="h-5 w-5" />,
    gradient: "from-orange-500 to-red-500"
  }
];

export function DashboardContent({
  githubId,
  userName,
}: DashboardContentProps) {
  const user = useQuery(api.users.getUserByGithubId, { githubId });

  if (!user) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="mb-2 text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Welcome back, {userName}!
          </h2>
          <p className="text-muted-foreground">Setting up your dashboard...</p>
        </div>
        <Card className="glass p-8 backdrop-blur-xl">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            <div>
              <h3 className="text-lg font-semibold">Initializing your workspace</h3>
              <p className="text-muted-foreground">This will just take a moment...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mb-2 text-4xl font-bold">
          Welcome back, 
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            {" "}{userName}!
          </span>
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your documentation generation activity
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="glass glass-hover p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    {stat.change.includes('+') ? (
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    ) : stat.change === "Processing" ? (
                      <Clock className="h-3 w-3 mr-1 animate-pulse text-yellow-500" />
                    ) : null}
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} opacity-20`}>
                  <div className={`bg-gradient-to-r ${stat.gradient} bg-clip-text`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="glass p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] text-left">
              <BarChart3 className="h-6 w-6 mb-2 text-blue-500" />
              <h4 className="font-semibold mb-1">Analytics</h4>
              <p className="text-sm text-muted-foreground">View detailed metrics</p>
            </button>
            <button className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] text-left">
              <Users className="h-6 w-6 mb-2 text-green-500" />
              <h4 className="font-semibold mb-1">Team</h4>
              <p className="text-sm text-muted-foreground">Manage collaborators</p>
            </button>
            <button className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] text-left">
              <FileText className="h-6 w-6 mb-2 text-purple-500" />
              <h4 className="font-semibold mb-1">Templates</h4>
              <p className="text-sm text-muted-foreground">Browse doc templates</p>
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Repository List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <RepositoryList userId={user._id} />
      </motion.div>
    </div>
  );
}
