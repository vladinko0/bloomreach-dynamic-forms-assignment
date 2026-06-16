# Dynamic Customer Forms for Bloomreach Engagement Web SDK

## Scope

Primary platform: Web SDK in TypeScript running in the browser.

The feature lets a marketer define a small dynamic form in Bloomreach Engagement and lets a customer website render that form inside its own page. The first iteration supports 1 to 5 short text inputs, each with a title and placeholder, plus configurable submit button text. The design intentionally separates the form model, rendering, and submission transport so future input types can be added without breaking the public integration API.

## Key assumptions

- The server already knows how to select the right form for a customer, campaign, placement, locale, or experiment variant.
- The SDK can either fetch a server-provided form configuration or receive one that was fetched by the host application.
- Submission should be tracked back to Bloomreach Engagement through an existing tracking pipeline when possible, but a dedicated submission endpoint is still useful for stronger schema validation and attribution.
- Customer applications should control the visual design. The SDK should create semantic HTML and stable class names, not inject opinionated CSS.
- Consent and customer identification stay the responsibility of the existing SDK initialization flow.

## Architecture

### Modules

1. Form schema
   - Versioned JSON payload received from Bloomreach Engagement.
   - Discriminated field model, currently `type: "text"`.
   - Server payload includes stable IDs, revision ID, labels, placeholders, validation rules, and tracking metadata.

2. Headless core
   - Validates server configuration.
   - Normalizes values.
   - Validates submitted values.
   - Builds a submission payload.
   - Calls the transport or existing tracking adapter.

3. DOM renderer
   - Creates native browser form elements.
   - Uses `textContent` and DOM APIs instead of HTML string interpolation.
   - Adds accessibility attributes such as `for`, `aria-invalid`, and `aria-describedby`.
   - Exposes a controller with `submit`, `getValues`, `setValues`, `setDisabled`, and `destroy`.

4. Transport adapter
   - Fetches form configuration.
   - Submits completed forms.
   - Can be replaced by an adapter backed by existing `exponea.track(...)`.

### Why this shape

- Backward compatibility: The top-level render API can remain stable while field types expand from `text` to `email`, `select`, `checkbox`, consent, date, etc.
- Host look and feel: Native DOM elements inherit customer website styling and can be customized with class names.
- Testability: Schema validation and submission logic can be unit-tested without a browser. Rendering can be integration-tested separately.
- Security: The renderer never injects marketer-provided HTML.
- Operational safety: Versioned schema plus revision IDs make it possible to debug exactly which form version was shown and submitted.

## Data flow

1. Marketer creates or updates a dynamic form in Bloomreach Engagement.
2. Website calls `renderDynamicForm({ formId, target, ... })`.
3. SDK fetches `GET /sdk/forms/v1/forms/{form_id}` with placement, locale, SDK version, and customer context.
4. SDK validates the returned schema and renders native DOM controls into the target element.
5. Customer enters values and submits.
6. SDK validates values locally.
7. SDK submits `POST /sdk/forms/v1/submissions` or tracks a `dynamic_form_submit` event through the existing Web SDK tracker.
8. SDK calls `onSubmitSuccess(result)` or `onSubmitError(error)`.
9. Host application can update UI, close a modal, show a toast, navigate, or re-render based on the callback.

## Server API and payload specification

### Fetch form configuration

`GET /sdk/forms/v1/forms/{form_id}`

Query parameters:

| Name | Required | Example | Description |
| --- | --- | --- | --- |
| `placement` | no | `profile_preferences` | Host-defined slot or page area. |
| `locale` | no | `en-US` | Requested localization. |
| `sdk` | yes | `web` | Calling SDK family. |
| `sdk_version` | yes | `4.2.0` | Calling SDK version. |
| `customer_id` | no | `hard-id-123` | Existing identified customer context, if available. |
| `anonymous_id` | no | `cookie-id-123` | Existing anonymous context, if available. |

Example response:

```json
{
  "schemaVersion": 1,
  "id": "style-preferences",
  "revisionId": "rev_2026_06_16_01",
  "title": "Tell us what you like",
  "submitButton": {
    "text": "Save preferences",
    "pendingText": "Saving..."
  },
  "fields": [
    {
      "id": "favorite_category",
      "type": "text",
      "title": "Favorite category",
      "placeholder": "Running shoes",
      "required": true,
      "maxLength": 80
    },
    {
      "id": "preferred_brand",
      "type": "text",
      "title": "Preferred brand",
      "placeholder": "Acme",
      "required": false,
      "maxLength": 80
    }
  ],
  "tracking": {
    "eventName": "dynamic_form_submit",
    "source": "dynamic_form"
  },
  "meta": {
    "campaignId": "cmp_123",
    "experimentVariant": "B"
  }
}
```

Validation rules for version 1:

- `schemaVersion` must be `1`.
- `fields.length` must be from 1 to 5.
- Every field ID must be stable, unique inside the form, and safe as an object key.
- Version 1 supports only `type: "text"`.
- `title` and `submitButton.text` are plain text, not HTML.
- `maxLength` should be set by the server, with a product-level default such as 255.

### Submit form values

`POST /sdk/forms/v1/submissions`

Example request:

```json
{
  "schemaVersion": 1,
  "formId": "style-preferences",
  "revisionId": "rev_2026_06_16_01",
  "submittedAt": "2026-06-16T10:15:30.000Z",
  "placement": "profile_preferences",
  "locale": "en-US",
  "values": {
    "favorite_category": "Running shoes",
    "preferred_brand": "Acme"
  },
  "fieldOrder": ["favorite_category", "preferred_brand"],
  "sdk": {
    "name": "engagement-web-sdk",
    "version": "4.2.0"
  },
  "meta": {
    "campaignId": "cmp_123",
    "experimentVariant": "B"
  }
}
```

Example response:

```json
{
  "status": "accepted",
  "submissionId": "sub_01JY3...",
  "trackedEventId": "evt_01JY3..."
}
```

Recommended tracked event if using the existing Web SDK event pipeline:

```ts
exponea.track("dynamic_form_submit", {
  form_id: "style-preferences",
  form_revision_id: "rev_2026_06_16_01",
  placement: "profile_preferences",
  values: {
    favorite_category: "Running shoes",
    preferred_brand: "Acme"
  },
  field_count: 2
});
```

Bloomreach's public web tracking documentation shows custom event tracking through `exponea.track(...)`. The React Native SDK uses `Exponea.trackEvent(...)` for custom events, so the same conceptual event can be kept across Web and React Native integrations.

## Programmatic interface

### Code structure

The public SDK entrypoint is `src/dynamicForms.ts`. It re-exports smaller
modules from `src/dynamic-forms/`:

- `types.ts`: public schemas, interfaces, and callback contracts.
- `validation.ts`: form configuration and value validation.
- `submission.ts`: submission payload building and tracking integration.
- `transport.ts`: fetch-based API transport.
- `rendering/`: DOM rendering, field rendering, and value/error state helpers.
- `utils/`: small DOM and HTTP helpers.

### Render into a website

```ts
import {
  createFetchTransport,
  renderDynamicForm
} from "./src/dynamicForms";

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
    input: "PreferencesForm-input",
    button: "Button Button--primary"
  },
  onSubmitSuccess: result => {
    console.log("Form submitted", result.submissionId);
  },
  onSubmitError: error => {
    console.error("Form failed", error);
  }
});

// Later, if the surrounding page unmounts:
controller.destroy();
```

### Headless submission

```ts
await submitDynamicForm({
  config,
  values: {
    favorite_category: "Running shoes"
  },
  placement: "profile_preferences",
  tracker: {
    track: (eventName, properties) => exponea.track(eventName, properties)
  }
});
```

### Callback contract

```ts
type OnSubmitSuccess = (result: DynamicFormSubmitResult) => void;
type OnSubmitError = (error: DynamicFormError) => void;
```

Callbacks are invoked after the SDK has finished its own submission attempt. They should not control whether tracking happens. If the host application needs to intercept submission, a future `beforeSubmit` hook can be added as an optional extension without changing the current callback contract.

## Error handling

The SDK should expose typed errors:

- `config_error`: invalid or unsupported form payload.
- `validation_error`: user values do not satisfy local rules.
- `network_error`: transport failed or returned a non-2xx response.
- `tracking_error`: existing tracking adapter failed.
- `render_error`: target element missing or renderer cannot build a field.

For user-facing validation errors, the default DOM renderer should show simple inline text near the field. Network and tracking errors should be passed to the host callback because every customer application has its own notification pattern.

## Future extension points

- Add new field types with discriminated union members, for example `email`, `number`, `select`, `checkbox`, `radio`, `date`, and `consent`.
- Add a custom field renderer registry for advanced host applications.
- Add server-driven localization.
- Add analytics events for `dynamic_form_view`, `dynamic_form_start`, and `dynamic_form_validation_error`.
- Add React and React Native convenience wrappers that reuse the same schema and headless validation logic.
- Add offline queueing by delegating to the existing SDK event queue.

## Quality assurance strategy

1. Contract tests
   - Validate example server payloads against the TypeScript schema and JSON Schema.
   - Keep fixtures for old schema versions and future versions.
   - Verify that unknown future optional fields are ignored safely.

2. Unit tests
   - Config validation: field count, duplicate IDs, unsupported types, missing titles, invalid lengths.
   - Value validation: required fields, max length, trimming behavior, field IDs not present in config.
   - Submission payload builder: correct form ID, revision ID, field order, placement, locale, and metadata.
   - Error normalization and callback invocation.

3. DOM integration tests
   - Render one to five fields.
   - Submit valid values.
   - Show validation errors without submitting.
   - Disable submit button while a request is in flight.
   - Destroy removes event listeners and DOM nodes.

4. Accessibility checks
   - Every input has a label.
   - Validation errors are announced with `role="alert"`.
   - Keyboard-only submission works.
   - Focus stays predictable after validation failure.

5. Browser compatibility
   - Test on current Chromium, Firefox, WebKit, and mobile web.
   - Avoid APIs that need large polyfills, or isolate them behind adapter boundaries.

6. Security and privacy
   - Never render marketer-provided HTML.
   - Keep max length limits both server-side and client-side.
   - Respect SDK consent state before tracking.
   - Avoid logging form values in production.
   - Treat values as potentially sensitive customer data.

7. Performance and reliability
   - Keep payload small and cacheable by revision.
   - Use abortable fetch for page transitions.
   - Avoid layout-heavy rendering.
   - Track internal SDK errors with non-PII diagnostics.

8. Release strategy
   - Ship behind a feature flag or SDK minor version.
   - Keep schema versioning explicit.
   - Add deprecation policy for old field types or endpoint versions.
   - Publish migration notes before adding required server fields.

## React Native fit

Although this proposal implements the Web SDK first, the same schema should be reusable in React Native:

- Keep the schema, validation, and payload builder in TypeScript.
- Provide a `<DynamicForm />` component that renders `TextInput`, `Text`, and `Pressable`.
- Submit through the existing `Exponea.trackEvent(...)` method or a native-backed SDK queue.
- Avoid native iOS or Android changes in the first iteration unless offline queueing, consent synchronization, or deep native attribution is required.

The public React Native SDK repository describes the SDK as a TypeScript wrapper around native Android and iOS SDKs. That makes a TypeScript-first wrapper/component a natural fit for a small form-rendering layer.

## References reviewed

- React Native SDK repository: https://github.com/exponea/exponea-react-native-sdk
- React Native SDK docs: https://documentation.bloomreach.com/engagement/docs/react-native-sdk
- React Native tracking docs: https://documentation.bloomreach.com/engagement/docs/react-native-sdk-tracking
- Web tracking docs: https://documentation.bloomreach.com/engagement/docs/web-tracking
- In-app messages docs: https://documentation.bloomreach.com/engagement/docs/in-app-messages
