"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RepoCard } from "./repo-card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { type Id } from "../../../convex/_generated/dataModel";

interface RepositoryListProps {
  userId: Id<"users">;
}

export function RepositoryList({ userId }: RepositoryListProps) {
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState<Id<"repositories"> | null>(
    null,
  );
  const [isFetching, setIsFetching] = useState(false);

  const repositories = useQuery(api.repositories.listUserRepositories, {
    userId,
  });
  const fetchRepositories = useAction(api.repositories.fetchGitHubRepositories);
  const createJob = useMutation(api.jobs.create);

  const handleFetchRepositories = async () => {
    if (!session?.accessToken) {
      toast.error("Aucun jeton d'accès disponible");
      return;
    }

    setIsFetching(true);
    try {
      await fetchRepositories({
        accessToken: session.accessToken,
        userId,
      });
      toast.success("Dépôts récupérés avec succès");
    } catch (error) {
      console.error("Error fetching repositories:", error);
      toast.error("Échec de la récupération des dépôts");
    } finally {
      setIsFetching(false);
    }
  };

  const handleGenerateDocs = async (repositoryId: Id<"repositories">) => {
    setIsGenerating(repositoryId);
    try {
      const result = await createJob({
        userId,
        repositoryId,
      });

      toast.success("Génération de la documentation démarrée");
      console.log("Job created:", result);
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Échec du démarrage de la génération de documentation");
    } finally {
      setIsGenerating(null);
    }
  };

  useEffect(() => {
    if (repositories?.length === 0 && session?.accessToken) {
      void handleFetchRepositories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositories, session]);

  if (!repositories) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement des dépôts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">Vos Dépôts</h3>
        <Button
          onClick={handleFetchRepositories}
          disabled={isFetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={
              isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"
            }
          />
          Actualiser
        </Button>
      </div>

      {repositories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Aucun dépôt trouvé</p>
          <Button onClick={handleFetchRepositories} disabled={isFetching}>
            <RefreshCw
              className={
                isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"
              }
            />
            Récupérer les dépôts depuis GitHub
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo) => (
            <RepoCard
              key={repo._id}
              repo={repo}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
