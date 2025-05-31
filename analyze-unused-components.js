import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取所有 Vue 组件文件
const getAllVueFiles = (dir) => {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllVueFiles(fullPath));
    } else if (entry.name.endsWith(".vue")) {
      files.push(fullPath);
    }
  }

  return files;
};

// 从文件内容中提取组件导入
const extractImports = (content) => {
  const imports = [];
  const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+\.vue)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      name: match[1],
      path: match[2],
    });
  }

  return imports;
};

// 从模板中提取组件使用
const extractComponentUsage = (content) => {
  const components = [];
  const componentRegex = /<([A-Z][a-zA-Z0-9-]*)[^>]*>/g;
  let match;

  while ((match = componentRegex.exec(content)) !== null) {
    components.push(match[1]);
  }

  return [...new Set(components)]; // 去重
};

// 主分析函数
const analyzeComponents = () => {
  const srcDir = path.join(__dirname, "src");
  const allVueFiles = getAllVueFiles(srcDir);

  // 所有组件文件
  const allComponents = allVueFiles.map((file) => {
    const relativePath = path.relative(srcDir, file);
    const name = path.basename(file, ".vue");
    return {
      name,
      path: relativePath,
      fullPath: file,
    };
  });

  console.log("=== 所有组件文件 ===");
  allComponents.forEach((comp) => {
    console.log(`${comp.name} - ${comp.path}`);
  });

  // 收集所有导入和使用
  const imported = new Set();
  const usedInTemplate = new Set();

  for (const file of allVueFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");

      // 提取导入
      const imports = extractImports(content);
      imports.forEach((imp) => imported.add(imp.name));

      // 提取模板使用
      const templateComponents = extractComponentUsage(content);
      templateComponents.forEach((comp) => usedInTemplate.add(comp));
    } catch (error) {
      console.error(`读取文件失败: ${file}`, error.message);
    }
  }

  console.log("\n=== 被导入的组件 ===");
  console.log([...imported].sort());

  console.log("\n=== 在模板中使用的组件 ===");
  console.log([...usedInTemplate].sort());

  // 查找未使用的组件
  const unusedComponents = allComponents.filter((comp) => {
    return !imported.has(comp.name) && !usedInTemplate.has(comp.name);
  });

  console.log("\n=== 可能未使用的组件 ===");
  if (unusedComponents.length === 0) {
    console.log("没有发现明显未使用的组件");
  } else {
    unusedComponents.forEach((comp) => {
      console.log(`- ${comp.name} (${comp.path})`);
    });
  }

  // 特殊检查：查找只被导入但未在模板中使用的组件
  const importedButNotUsed = [...imported].filter(
    (name) => !usedInTemplate.has(name)
  );
  console.log("\n=== 被导入但可能未在模板中使用的组件 ===");
  if (importedButNotUsed.length === 0) {
    console.log("所有导入的组件都在模板中使用了");
  } else {
    importedButNotUsed.forEach((name) => {
      console.log(`- ${name}`);
    });
  }
};

analyzeComponents();
