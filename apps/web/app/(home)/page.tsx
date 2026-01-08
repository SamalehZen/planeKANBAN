"use client";

import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { useUser } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { LogoSpinner } from "@/components/common/logo-spinner";

const HomePage = observer(() => {
  const router = useAppRouter();
  const { fetchCurrentUser, data: currentUser, isLoading } = useUser();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUser?.id && !isLoading) {
      router.push("/create-workspace");
    }
  }, [currentUser, isLoading, router]);

  return (
    <div className="relative flex h-screen w-full items-center justify-center">
      <LogoSpinner />
    </div>
  );
});

export default HomePage;
