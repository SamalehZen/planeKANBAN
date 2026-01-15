import { useForm } from "react-hook-form";
import { Lightbulb, Mic } from "lucide-react";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IFormattedInstanceConfiguration, TInstanceSpeechConfigurationKeys } from "@plane/types";
import type { TControllerInputFormField } from "@/components/common/controller-input";
import { ControllerInput } from "@/components/common/controller-input";
import { useInstance } from "@/hooks/store";

type IInstanceSpeechForm = {
  config: IFormattedInstanceConfiguration;
};

type SpeechFormValues = Record<TInstanceSpeechConfigurationKeys, string>;

export function InstanceSpeechForm(props: IInstanceSpeechForm) {
  const { config } = props;
  const { updateInstanceConfigurations } = useInstance();
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SpeechFormValues>({
    defaultValues: {
      ASSEMBLYAI_API_KEY: config["ASSEMBLYAI_API_KEY"] || "",
    },
  });

  const speechFormFields: TControllerInputFormField[] = [
    {
      key: "ASSEMBLYAI_API_KEY",
      type: "password",
      label: "AssemblyAI API Key",
      description: (
        <>
          Get your AssemblyAI API key from{" "}
          <a
            href="https://www.assemblyai.com/app/account"
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            AssemblyAI Dashboard
          </a>
        </>
      ),
      placeholder: "Enter your AssemblyAI API key",
      error: Boolean(errors.ASSEMBLYAI_API_KEY),
      required: false,
    },
  ];

  const onSubmit = async (formData: SpeechFormValues) => {
    const payload: Partial<SpeechFormValues> = { ...formData };

    await updateInstanceConfigurations(payload)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success",
          message: "Speech-to-Text settings updated successfully",
        })
      )
      .catch((err) => console.error(err));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-accent-primary/10">
            <Mic className="size-5 text-accent-primary" />
          </div>
          <div>
            <div className="pb-1 text-18 font-medium text-primary">AssemblyAI Configuration</div>
            <div className="text-13 font-regular text-tertiary">
              Enable real-time speech-to-text transcription powered by AssemblyAI.
            </div>
          </div>
        </div>
        <div className="grid-col grid w-full grid-cols-1 items-center justify-between gap-x-12 gap-y-8 lg:grid-cols-2 pt-4">
          {speechFormFields.map((field) => (
            <ControllerInput
              key={field.key}
              control={control}
              type={field.type}
              name={field.key}
              label={field.label}
              description={field.description}
              placeholder={field.placeholder}
              error={field.error}
              required={field.required}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 items-start">
        <Button variant="primary" size="lg" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>

        <div className="relative inline-flex items-center gap-2 rounded-sm border border-accent-strong/20 bg-accent-primary/10 px-4 py-2 text-11 text-accent-secondary">
          <Lightbulb height="14" width="14" />
          <div>
            Speech-to-text enables voice input in editors and form fields. Users can click the microphone button to
            dictate text.
          </div>
        </div>
      </div>
    </div>
  );
}
