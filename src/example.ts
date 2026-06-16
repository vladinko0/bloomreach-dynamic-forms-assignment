import {
  createFetchTransport,
  renderDynamicForm,
  type DynamicFormConfig
} from "./dynamicForms";

declare const exponea: {
  track(eventName: string, properties: Record<string, unknown>): void;
};

export async function renderFetchedForm(): Promise<void> {
  const controller = await renderDynamicForm({
    formId: "style-preferences",
    target: "#preferences-form-slot",
    placement: "profile_preferences",
    locale: "en-US",
    transport: createFetchTransport({
      baseUrl: "https://api.example.bloomreach.cloud",
      publicToken: "project-public-token"
    }),
    tracker: {
      track: (eventName, properties) => exponea.track(eventName, properties)
    },
    classNames: {
      form: "PreferencesForm",
      field: "PreferencesForm-field",
      label: "PreferencesForm-label",
      input: "PreferencesForm-input",
      button: "Button Button--primary",
      error: "PreferencesForm-error"
    },
    onSubmitSuccess: result => {
      console.log("Dynamic form submitted", result);
    },
    onSubmitError: error => {
      console.error("Dynamic form failed", error.code, error.details);
    }
  });

  window.addEventListener("pagehide", () => controller.destroy(), { once: true });
}

export async function renderStaticConfigForTesting(): Promise<void> {
  const config: DynamicFormConfig = {
    schemaVersion: 1,
    id: "style-preferences",
    revisionId: "rev_2026_06_16_01",
    title: "Tell us what you like",
    submitButton: {
      text: "Save preferences",
      pendingText: "Saving..."
    },
    fields: [
      {
        id: "favorite_category",
        type: "text",
        title: "Favorite category",
        placeholder: "Running shoes",
        required: true,
        maxLength: 80
      },
      {
        id: "preferred_brand",
        type: "text",
        title: "Preferred brand",
        placeholder: "Acme",
        maxLength: 80
      }
    ],
    tracking: {
      eventName: "dynamic_form_submit",
      source: "dynamic_form"
    },
    meta: {
      campaignId: "cmp_123",
      experimentVariant: "B"
    }
  };

  await renderDynamicForm({
    config,
    target: "#preferences-form-slot",
    tracker: {
      track: (eventName, properties) => exponea.track(eventName, properties)
    }
  });
}

