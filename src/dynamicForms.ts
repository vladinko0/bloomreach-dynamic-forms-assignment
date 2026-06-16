// src/dynamicForms.ts
/**
 * Public SDK entrypoint for the dynamic forms assignment.
 *
 * This file intentionally contains only re-exports. It keeps the external
 * integration API stable (`import {renderDynamicForm} from './dynamicForms'`)
 * while the implementation is split into focused internal modules. That shape
 * comes from the assignment goal of minimizing future breaking changes for
 * customer website integrations.
 */
export * from './dynamic-forms/constants';
export * from './dynamic-forms/errors';
export * from './dynamic-forms/types';
export * from './dynamic-forms/validation';
export * from './dynamic-forms/submission';
export * from './dynamic-forms/transport';
export * from './dynamic-forms/rendering/renderDynamicForm';
