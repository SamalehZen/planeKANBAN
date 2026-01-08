"use client";

import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { useUser, useUserSettings } from "@/hooks/store/user";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useAppRouter } from "@/hooks/use-app-router";
import { LogoSpinner } from "@/components/common/logo-spinner";

const HomePage = observer(() => {
  const router = useAppRouter();
  const { fetchCurrentUser, data: currentUser, isLoading } = useUser();
  const { data: userSettings } = useUserSettings();
  const { workspaces } = useWorkspace();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUser?.id && !isLoading) {
      const workspaceSlug = userSettings?.workspace?.last_workspace_slug || 
        userSettings?.workspace?.fallback_workspace_slug;
      
      const hasWorkspace = Object.values(workspaces || {}).length > 0;
      
      if (workspaceSlug && hasWorkspace) {
        router.push(`/${workspaceSlug}`);
      } else {
        router.push("/create-workspace");
      }
    }
  }, [currentUser, isLoading, userSettings, workspaces, router]);

  return (
    <div className="relative flex h-screen w-full items-center justify-center">
      <LogoSpinner />
    </div>
  );
});

export default HomePage;
