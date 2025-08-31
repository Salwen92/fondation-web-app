"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/generated/api";
import { Id } from "@convex/generated/dataModel";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface JobDetailPageProps {
  params: {
    id: string;
  };
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const router = useRouter();
  const [lastLogSeq, setLastLogSeq] = useState<number>(-1);
  
  const job = useQuery(api.jobs.getJob, { 
    jobId: params.id as Id<"jobs"> 
  });
  
  const logs = useQuery(api.jobs.getLogs, { 
    jobId: params.id as Id<"jobs">,
    afterSeq: lastLogSeq 
  });

  // Update last log sequence when new logs arrive
  useEffect(() => {
    if (logs && logs.length > 0) {
      const maxSeq = Math.max(...logs.map(log => log.seq));
      if (maxSeq > lastLogSeq) {
        setLastLogSeq(maxSeq);
      }
    }
  }, [logs, lastLogSeq]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
      case "pending":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Job Analysis</h1>
          <div className="flex items-center space-x-2">
            {getStatusIcon(job.status)}
            <Badge 
              className={getStatusColor(job.status)}
              data-testid="job-status"
            >
              {job.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Job Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Job Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Created:</span>
              <div>{new Date(job.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status:</span>
              <div>{job.status}</div>
            </div>
            {job.completedAt && (
              <div>
                <span className="text-sm text-muted-foreground">Completed:</span>
                <div>{new Date(job.completedAt).toLocaleString()}</div>
              </div>
            )}
            {job.error && (
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Error:</span>
                <div className="text-red-600">{job.error}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Logs */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Live Logs</h2>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <div 
                  key={log.seq} 
                  className={`mb-1 ${log.level === 'error' ? 'text-red-400' : 'text-green-400'}`}
                  data-testid={`job-log-line-${log.seq}`}
                >
                  <span className="text-gray-500">
                    [{new Date(log.ts).toLocaleTimeString()}]
                  </span>{' '}
                  {log.msg}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No logs available yet...</div>
            )}
          </div>
        </Card>

        {/* Artifacts */}
        {job.status === "completed" && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Artifacts</h2>
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white"
              data-testid="job-artifacts-link"
            >
              View Generated Course
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}