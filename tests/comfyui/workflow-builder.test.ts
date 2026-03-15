import { describe, it, expect } from 'vitest';
import { buildWorkflow, SUPPORTED_STYLES } from '../../src/comfyui/workflow-builder.js';
import type { WorkflowInput, VideoStyle, ComfyUIWorkflow } from '../../src/comfyui/workflow-types.js';
import { DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_DURATION_SEC } from '../../src/shared/constants.js';

const BASE_INPUT: WorkflowInput = {
  prompt: '고급스러운 커피 브랜드 홍보 영상',
  style: 'realistic',
};

describe('buildWorkflow', () => {
  it('realistic 스타일의 워크플로우를 생성한다', () => {
    const workflow = buildWorkflow(BASE_INPUT);

    expect(workflow).toBeDefined();
    assertValidWorkflow(workflow);
    assertContainsPrompt(workflow, BASE_INPUT.prompt);
  });

  it('3d-product 스타일의 워크플로우를 생성한다', () => {
    const input: WorkflowInput = { ...BASE_INPUT, style: '3d-product' };
    const workflow = buildWorkflow(input);

    assertValidWorkflow(workflow);
    assertContainsPrompt(workflow, input.prompt);
  });

  it('3d-character 스타일의 워크플로우를 생성한다', () => {
    const input: WorkflowInput = { ...BASE_INPUT, style: '3d-character' };
    const workflow = buildWorkflow(input);

    assertValidWorkflow(workflow);
    assertContainsPrompt(workflow, input.prompt);
  });

  it('기본 해상도 1920x1080을 적용한다', () => {
    const workflow = buildWorkflow(BASE_INPUT);

    assertContainsValue(workflow, DEFAULT_VIDEO_WIDTH);
    assertContainsValue(workflow, DEFAULT_VIDEO_HEIGHT);
  });

  it('커스텀 해상도를 적용한다', () => {
    const input: WorkflowInput = { ...BASE_INPUT, width: 1280, height: 720 };
    const workflow = buildWorkflow(input);

    assertContainsValue(workflow, 1280);
    assertContainsValue(workflow, 720);
  });

  it('커스텀 시드를 적용한다', () => {
    const input: WorkflowInput = { ...BASE_INPUT, seed: 42 };
    const workflow = buildWorkflow(input);

    assertContainsValue(workflow, 42);
  });

  it('네거티브 프롬프트를 적용한다', () => {
    const input: WorkflowInput = {
      ...BASE_INPUT,
      negativePrompt: 'blurry, low quality',
    };
    const workflow = buildWorkflow(input);

    assertContainsPrompt(workflow, 'blurry, low quality');
  });

  it('기본 영상 길이를 적용한다', () => {
    const workflow = buildWorkflow(BASE_INPUT);

    assertContainsValue(workflow, DEFAULT_VIDEO_DURATION_SEC);
  });

  it('커스텀 영상 길이를 적용한다', () => {
    const input: WorkflowInput = { ...BASE_INPUT, durationSec: 15 };
    const workflow = buildWorkflow(input);

    assertContainsValue(workflow, 15);
  });

  it('지원하지 않는 스타일이면 에러를 던진다', () => {
    const input = { ...BASE_INPUT, style: 'unknown' as VideoStyle };

    expect(() => buildWorkflow(input)).toThrow();
  });

  it('SUPPORTED_STYLES에 3가지 스타일이 포함된다', () => {
    expect(SUPPORTED_STYLES).toContain('realistic');
    expect(SUPPORTED_STYLES).toContain('3d-product');
    expect(SUPPORTED_STYLES).toContain('3d-character');
    expect(SUPPORTED_STYLES).toHaveLength(3);
  });

  it('동일 입력+시드로 동일한 워크플로우를 생성한다', () => {
    const input: WorkflowInput = { ...BASE_INPUT, seed: 123 };
    const a = buildWorkflow(input);
    const b = buildWorkflow(input);

    expect(a).toEqual(b);
  });

  it('각 스타일별 워크플로우 구조가 다르다', () => {
    const styles: VideoStyle[] = ['realistic', '3d-product', '3d-character'];
    const workflows = styles.map((style) =>
      JSON.stringify(Object.values(buildWorkflow({ ...BASE_INPUT, style })).map((n) => n.class_type).sort()),
    );

    const uniqueStructures = new Set(workflows);
    expect(uniqueStructures.size).toBe(3);
  });
});

function assertValidWorkflow(workflow: ComfyUIWorkflow) {
  const keys = Object.keys(workflow);
  expect(keys.length).toBeGreaterThan(0);

  for (const key of keys) {
    const node = workflow[key];
    expect(node).toHaveProperty('class_type');
    expect(typeof node.class_type).toBe('string');
    expect(node).toHaveProperty('inputs');
    expect(typeof node.inputs).toBe('object');
  }
}

function assertContainsPrompt(workflow: ComfyUIWorkflow, prompt: string) {
  const json = JSON.stringify(workflow);
  expect(json).toContain(prompt);
}

function assertContainsValue(workflow: ComfyUIWorkflow, value: number) {
  const json = JSON.stringify(workflow);
  expect(json).toContain(String(value));
}
