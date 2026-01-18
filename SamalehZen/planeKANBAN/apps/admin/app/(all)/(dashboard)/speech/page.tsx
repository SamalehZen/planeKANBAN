import { observer } from "mobx-react";
import useSWR from "swr";
import { Loader } from "@plane/ui";
import { useInstance } from "@/hooks/store";
import type { Route } from "./+types/page";
import { InstanceSpeechForm } from "./form";

const InstanceSpeechPage = observer(function InstanceSpeechPage(_props: Route.ComponentProps) {
  const { fetchInstanceConfigurations, formattedConfig } = useInstance();

  useSWR("INSTANCE_CONFIGURATIONS", () => fetchInstanceConfigurations());

  return (
    <>
      <div className="relative container mx-auto w-full h-full p-4 py-4 space-y-6 flex flex-col">
        <div className="border-b border-subtle mx-4 py-4 space-y-1 flex-shrink-0">
          <div className="text-18 font-medium text-primary">Speech-to-Text for all your workspaces</div>
          <div className="text-13 font-regular text-tertiary">
            Configure AssemblyAI to enable real-time speech-to-text transcription across all workspaces. Users can
            dictate text using their microphone in editors and form fields.
          </div>
        </div>
        <div className="flex-grow overflow-hidden overflow-y-scroll vertical-scrollbar scrollbar-md px-4">
          {formattedConfig ? (
            <InstanceSpeechForm config={formattedConfig} />
          ) : (
            <Loader className="space-y-8">
              <Loader.Item height="50px" width="40%" />
              <div className="w-2/3 grid grid-cols-2 gap-x-8 gap-y-4">
                <Loader.Item height="50px" />
              </div>
              <Loader.Item height="50px" width="20%" />
            </Loader>
          )}
        </div>
      </div>
    </>
  );
});

export const meta: Route.MetaFunction = () => [{ title: "Speech-to-Text Settings - God Mode" }];

export default InstanceSpeechPage;
