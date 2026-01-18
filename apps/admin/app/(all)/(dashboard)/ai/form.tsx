import { useForm, useWatch } from "react-hook-form";
import { Lightbulb } from "lucide-react";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IFormattedInstanceConfiguration, TInstanceAIConfigurationKeys, TLLMProvider } from "@plane/types";
import { LLM_PROVIDERS } from "@plane/types";
// components
import type { TControllerInputFormField } from "@/components/common/controller-input";
import { ControllerInput } from "@/components/common/controller-input";
// hooks
import { useInstance } from "@/hooks/store";

type IInstanceAIForm = {
  config: IFormattedInstanceConfiguration;
};

type AIFormValues = Record<TInstanceAIConfigurationKeys, string>;

export function InstanceAIForm(props: IInstanceAIForm) {
  const { config } = props;
  // store
  const { updateInstanceConfigurations } = useInstance();
  // form data
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AIFormValues>({
    defaultValues: {
      LLM_PROVIDER: config["LLM_PROVIDER"] || "mimo",
      LLM_API_KEY: config["LLM_API_KEY"],
      LLM_MODEL: config["LLM_MODEL"],
    },
  });

  const selectedProvider = useWatch({
    control,
    name: "LLM_PROVIDER",
    defaultValue: config["LLM_PROVIDER"] || "mimo",
  }) as TLLMProvider;

  const providerConfig = LLM_PROVIDERS[selectedProvider];

  const getProviderDocLink = (provider: TLLMProvider) => {
    switch (provider) {
      case "mimo":
        return "https://api.xiaomimimo.com";
      case "openai":
        return "https://platform.openai.com/api-keys";
      case "gemini":
        return "https://aistudio.google.com/app/apikey";
      case "anthropic":
        return "https://console.anthropic.com/settings/keys";
      default:
        return "#";
    }
  };

  const getProviderModelLink = (provider: TLLMProvider) => {
    switch (provider) {
      case "mimo":
        return "https://api.xiaomimimo.com/docs/models";
      case "openai":
        return "https://platform.openai.com/docs/models/overview";
      case "gemini":
        return "https://ai.google.dev/gemini-api/docs/models/gemini";
      case "anthropic":
        return "https://docs.anthropic.com/en/docs/about-claude/models";
      default:
        return "#";
    }
  };

  const aiFormFields: TControllerInputFormField[] = [
    {
      key: "LLM_PROVIDER",
      type: "select",
      label: "AI Provider",
      description: "Choose your preferred AI model provider",
      options: Object.entries(LLM_PROVIDERS).map(([key, value]) => ({
        value: key,
        label: value.name,
      })),
      error: Boolean(errors.LLM_PROVIDER),
      required: true,
    },
    {
      key: "LLM_MODEL",
      type: "select",
      label: "Model",
      description: (
        <>
          Choose a {providerConfig.name} model.{" "}
          <a
            href={getProviderModelLink(selectedProvider)}
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            Learn more
          </a>
        </>
      ),
      options: providerConfig.models.map((model) => ({
        value: model,
        label: model,
      })),
      placeholder: providerConfig.defaultModel,
      error: Boolean(errors.LLM_MODEL),
      required: false,
    },
    {
      key: "LLM_API_KEY",
      type: "password",
      label: "API Key (Obligatoire)",
      description: (
        <>
          <span className="text-red-500 font-medium">Requis.</span> Obtenez votre clé API {providerConfig.name}{" "}
          <a
            href={getProviderDocLink(selectedProvider)}
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            ici.
          </a>
          {" "}Sans clé API, les fonctionnalités IA ne fonctionneront pas.
        </>
      ),
      placeholder: "Entrez votre clé API",
      error: Boolean(errors.LLM_API_KEY),
      required: true,
    },
  ];

  const onSubmit = async (formData: AIFormValues) => {
    const payload: Partial<AIFormValues> = { ...formData };

    await updateInstanceConfigurations(payload)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success",
          message: "AI Settings updated successfully",
        })
      )
      .catch((err) => console.error(err));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <div className="pb-1 text-18 font-medium text-primary">AI Configuration</div>
          <div className="text-13 font-regular text-tertiary">
            Configure your AI provider (Xiaomi MiMo, OpenAI, Google Gemini, or Anthropic Claude) to enable AI features across all
            workspaces. MiMo v2-Flash is recommended for 2.6x faster inference at 97.5% lower cost.
          </div>
        </div>
        <div className="grid-col grid w-full grid-cols-1 items-center justify-between gap-x-12 gap-y-8 lg:grid-cols-3">
          {aiFormFields.map((field) => (
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
              options={field.options}
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
            ⚠️ <strong>Important:</strong> Vous devez configurer une clé API pour activer les fonctionnalités IA (assistant vocal, amélioration de description, etc.).
            Providers supportés: Xiaomi MiMo (par défaut), OpenAI, Google Gemini, Anthropic Claude.
          </div>
        </div>
      </div>
    </div>
  );
}
