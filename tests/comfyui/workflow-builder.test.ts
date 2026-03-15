import { describe, it, expect } from 'vitest';
import {
  buildWorkflow,
  loadWorkflowTemplate,
  getAvailableStyles,
} from '../../src/comfyui/workflow-builder.js';
import { join } from 'node:path';
import type { VideoStyle, ComfyUIWorkflow, WorkflowConfig } from '../../src/comfyui/workflow-types.js';

const PROMPTS_DIR = join(import.meta.dirname, '..', '..', 'prompts', 'comfyui');

describe('workflow-builder', () => {
  describe('getAvailableStyles', () => {
    it('returns all three video styles', () => {
      const styles = getAvailableStyles();
      expect(styles).toHaveLength(3);
      expect(styles).toContain('realistic');
      expect(styles).toContain('3d-product');
      expect(styles).toContain('3d-character');
    });
  });

  describe('loadWorkflowTemplate', () => {
    it.each<VideoStyle>(['realistic', '3d-product', '3d-character'])(
      'loads %s template from prompts directory',
      async (style) => {
        const template = await loadWorkflowTemplate(style, PROMPTS_DIR);
        expect(template).toBeDefined();
        expect(typeof template).toBe('object');
        expect(Object.keys(template).length).toBeGreaterThan(0);
      },
    );

    it('throws on invalid prompts directory', async () => {
      await expect(
        loadWorkflowTemplate('realistic', '/nonexistent/path'),
      ).rejects.toThrow();
    });
  });

  describe('buildWorkflow', () => {
    const baseConfig: WorkflowConfig = {
      positivePrompt: 'A stunning cinematic shot of a modern city skyline at sunset',
      style: 'realistic',
      width: 1920,
      height: 1080,
      frameCount: 120,
      fps: 8,
      seed: 42,
    };

    it('substitutes positive prompt into template', async () => {
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, baseConfig);

      const positiveNode = findNodeByClassType(workflow, 'CLIPTextEncode');
      expect(positiveNode).toBeDefined();
      expect(positiveNode!.inputs['text']).toContain(baseConfig.positivePrompt);
    });

    it('substitutes negative prompt when provided', async () => {
      const config: WorkflowConfig = {
        ...baseConfig,
        negativePrompt: 'blurry, low quality',
      };
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, config);

      const nodes = findAllNodesByClassType(workflow, 'CLIPTextEncode');
      const negativeNode = nodes.find((n) =>
        String(n.inputs['text']).includes('blurry, low quality'),
      );
      expect(negativeNode).toBeDefined();
    });

    it('substitutes resolution values', async () => {
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, baseConfig);

      const latentNode = findNodeByClassType(workflow, 'EmptyLatentImage');
      expect(latentNode).toBeDefined();
      expect(latentNode!.inputs['width']).toBe(1920);
      expect(latentNode!.inputs['height']).toBe(1080);
    });

    it('substitutes frame count', async () => {
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, baseConfig);

      const latentNode = findNodeByClassType(workflow, 'EmptyLatentImage');
      expect(latentNode).toBeDefined();
      expect(latentNode!.inputs['batch_size']).toBe(120);
    });

    it('substitutes seed value', async () => {
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, baseConfig);

      const samplerNode = findNodeByClassType(workflow, 'KSampler');
      expect(samplerNode).toBeDefined();
      expect(samplerNode!.inputs['seed']).toBe(42);
    });

    it('uses default negative prompt when not provided', async () => {
      const config: WorkflowConfig = {
        positivePrompt: 'test prompt',
        style: 'realistic',
      };
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, config);

      const nodes = findAllNodesByClassType(workflow, 'CLIPTextEncode');
      const hasNegative = nodes.some((n) =>
        String(n.inputs['text']).includes('low quality'),
      );
      expect(hasNegative).toBe(true);
    });

    it('uses default dimensions from constants when not specified', async () => {
      const config: WorkflowConfig = {
        positivePrompt: 'test prompt',
        style: 'realistic',
      };
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, config);

      const latentNode = findNodeByClassType(workflow, 'EmptyLatentImage');
      expect(latentNode).toBeDefined();
      expect(latentNode!.inputs['width']).toBe(1920);
      expect(latentNode!.inputs['height']).toBe(1080);
    });

    it('generates random seed when not specified', async () => {
      const config: WorkflowConfig = {
        positivePrompt: 'test prompt',
        style: 'realistic',
      };
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow1 = buildWorkflow(template, config);
      const workflow2 = buildWorkflow(template, config);

      const seed1 = findNodeByClassType(workflow1, 'KSampler')!.inputs['seed'];
      const seed2 = findNodeByClassType(workflow2, 'KSampler')!.inputs['seed'];
      expect(typeof seed1).toBe('number');
      expect(typeof seed2).toBe('number');
    });

    it('produces valid JSON-serializable output', async () => {
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const workflow = buildWorkflow(template, baseConfig);
      const json = JSON.stringify(workflow);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(workflow);
    });

    it.each<VideoStyle>(['realistic', '3d-product', '3d-character'])(
      'builds %s workflow with correct structure',
      async (style) => {
        const config: WorkflowConfig = { ...baseConfig, style };
        const template = await loadWorkflowTemplate(style, PROMPTS_DIR);
        const workflow = buildWorkflow(template, config);

        expect(findNodeByClassType(workflow, 'CheckpointLoaderSimple')).toBeDefined();
        expect(findNodeByClassType(workflow, 'CLIPTextEncode')).toBeDefined();
        expect(findNodeByClassType(workflow, 'KSampler')).toBeDefined();
        expect(findNodeByClassType(workflow, 'VAEDecode')).toBeDefined();
        expect(findNodeByClassType(workflow, 'EmptyLatentImage')).toBeDefined();
      },
    );

    it('does not mutate the original template', async () => {
      const template = await loadWorkflowTemplate('realistic', PROMPTS_DIR);
      const originalJson = JSON.stringify(template);
      buildWorkflow(template, baseConfig);
      expect(JSON.stringify(template)).toBe(originalJson);
    });
  });
});

function findNodeByClassType(
  workflow: ComfyUIWorkflow,
  classType: string,
): { inputs: Record<string, unknown> } | undefined {
  for (const node of Object.values(workflow)) {
    if (node.class_type === classType) return node;
  }
  return undefined;
}

function findAllNodesByClassType(
  workflow: ComfyUIWorkflow,
  classType: string,
): { inputs: Record<string, unknown> }[] {
  return Object.values(workflow).filter((n) => n.class_type === classType);
}
