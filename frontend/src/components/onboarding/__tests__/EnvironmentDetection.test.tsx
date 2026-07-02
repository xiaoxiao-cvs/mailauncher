import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { EnvironmentDetection } from "../EnvironmentDetection";
import { EulaContext } from "../EulaContext";

vi.mock("@/hooks/queries/useEnvironmentQueries", () => ({
  useGitEnvironmentQuery: vi.fn(),
  usePythonVersionsQuery: vi.fn(),
}));

import {
  useGitEnvironmentQuery,
  usePythonVersionsQuery,
} from "@/hooks/queries/useEnvironmentQueries";

const mockUseGit = vi.mocked(useGitEnvironmentQuery);
const mockUsePython = vi.mocked(usePythonVersionsQuery);

function renderWithContext(props: {
  onEnvironmentReady?: (isReady: boolean) => void;
}) {
  const onCanProceedChange = vi.fn();
  const onButtonLabelChange = vi.fn();
  render(
    <EulaContext.Provider value={{ onCanProceedChange, onButtonLabelChange }}>
      <EnvironmentDetection stepColor="#000" {...props} />
    </EulaContext.Provider>,
  );
  return { onCanProceedChange, onButtonLabelChange };
}

describe("EnvironmentDetection 环境闸门", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("检测进行中时阻断下一步", () => {
    mockUseGit.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGitEnvironmentQuery>);
    mockUsePython.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePythonVersionsQuery>);

    const onEnvironmentReady = vi.fn();
    const { onCanProceedChange, onButtonLabelChange } = renderWithContext({
      onEnvironmentReady,
    });

    expect(onCanProceedChange).toHaveBeenCalledWith(false);
    expect(onButtonLabelChange).toHaveBeenCalledWith("正在检测环境...");
    expect(onEnvironmentReady).not.toHaveBeenCalled();
  });

  it("Git 与 Python 均就绪时放行下一步，并回调 onEnvironmentReady(true)", () => {
    mockUseGit.mockReturnValue({
      data: { is_available: true, path: "/usr/bin/git", version: "2.42.0" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGitEnvironmentQuery>);
    mockUsePython.mockReturnValue({
      data: [{ version: "3.11.5", path: "/usr/bin/python3", is_default: true }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePythonVersionsQuery>);

    const onEnvironmentReady = vi.fn();
    const { onCanProceedChange, onButtonLabelChange } = renderWithContext({
      onEnvironmentReady,
    });

    expect(onCanProceedChange).toHaveBeenCalledWith(true);
    expect(onButtonLabelChange).toHaveBeenCalledWith(null);
    expect(onEnvironmentReady).toHaveBeenCalledWith(true);
  });

  it("Python 未安装时阻断下一步，并回调 onEnvironmentReady(false)", () => {
    mockUseGit.mockReturnValue({
      data: { is_available: true, path: "/usr/bin/git", version: "2.42.0" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGitEnvironmentQuery>);
    mockUsePython.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePythonVersionsQuery>);

    const onEnvironmentReady = vi.fn();
    const { onCanProceedChange, onButtonLabelChange } = renderWithContext({
      onEnvironmentReady,
    });

    expect(onCanProceedChange).toHaveBeenCalledWith(false);
    expect(onButtonLabelChange).toHaveBeenCalledWith(
      "请先安装 Git 与 Python 后再继续",
    );
    expect(onEnvironmentReady).toHaveBeenCalledWith(false);
  });

  it("Git 未安装时阻断下一步，即使 Python 已就绪", () => {
    mockUseGit.mockReturnValue({
      data: { is_available: false, path: "", version: "" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGitEnvironmentQuery>);
    mockUsePython.mockReturnValue({
      data: [{ version: "3.11.5", path: "/usr/bin/python3", is_default: true }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePythonVersionsQuery>);

    const { onCanProceedChange } = renderWithContext({});

    expect(onCanProceedChange).toHaveBeenCalledWith(false);
  });
});
