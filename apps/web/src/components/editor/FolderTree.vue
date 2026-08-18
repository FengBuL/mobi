<script setup lang="ts">
import type { FileSystemNode } from '@/stores/folderSource'
import { Archive, Check, ChevronDown, ChevronRight, File, Folder, FolderInput, FolderOpen, Trash2, Undo2 } from 'lucide-vue-next'
import { isArchivedDraftPath, isArchiveDirectory } from '@/utils/draft-folder'

interface Props {
  nodes: FileSystemNode[]
  selectedPath?: string
  expandedPaths?: Set<string>
  checkedPaths?: string[]
  rootPath?: string
  level?: number
}

interface Emits {
  (e: 'select', node: FileSystemNode, event: MouseEvent): void
  (e: 'toggleExpand', path: string): void
  (e: 'toggleCheck', node: FileSystemNode, event: MouseEvent): void
  (e: 'remove', node: FileSystemNode): void
  (e: 'move', node: FileSystemNode): void
  (e: 'archive', node: FileSystemNode): void
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  expandedPaths: () => new Set<string>(),
  checkedPaths: () => [],
  rootPath: ``,
})

const emit = defineEmits<Emits>()

const isSelected = (path: string) => props.selectedPath === path
const isChecked = (path: string) => props.checkedPaths.includes(path)

const isExpanded = (path: string) => props.expandedPaths.has(path)

function handleNodeClick(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  emit(`select`, node, event)
  if (node.type === `directory` && !isExpanded(node.path) && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
    emit(`toggleExpand`, node.path)
  }
}

function handleToggleClick(node: FileSystemNode, event: MouseEvent) {
  event.stopPropagation()
  if (node.type === `directory`) {
    emit(`toggleExpand`, node.path)
  }
}
</script>

<template>
  <div class="folder-tree">
    <template v-for="node in nodes" :key="node.path">
      <!-- 节点本身 -->
      <div
        class="tree-node"
        :class="{
          selected: isSelected(node.path) || isChecked(node.path),
          directory: node.type === 'directory',
          file: node.type === 'file',
        }"
        :style="{ paddingLeft: `${level * 16 + 8}px` }"
        @click="handleNodeClick(node, $event)"
      >
        <!-- 展开/折叠图标 -->
        <span
          v-if="node.type === 'directory'"
          class="toggle-icon"
          @click="handleToggleClick(node, $event)"
        >
          <ChevronRight v-if="!isExpanded(node.path)" class="h-4 w-4" />
          <ChevronDown v-else class="h-4 w-4" />
        </span>
        <span v-else class="toggle-icon-placeholder" />

        <button
          v-if="node.type === `file`"
          type="button"
          class="tree-node__check"
          :class="{ checked: isChecked(node.path) }"
          :aria-checked="isChecked(node.path)"
          title="勾选这篇"
          @click.stop="emit('toggleCheck', node, $event)"
        >
          <Check v-if="isChecked(node.path)" class="h-3 w-3" />
        </button>
        <span v-else class="tree-node__check-spacer" />

        <!-- 文件/文件夹图标 -->
        <span class="node-icon">
          <Folder v-if="node.type === 'directory' && !isExpanded(node.path)" class="h-4 w-4" />
          <FolderOpen v-else-if="node.type === 'directory' && isExpanded(node.path)" class="h-4 w-4" />
          <File v-else class="h-4 w-4" />
        </span>

        <!-- 节点名称 -->
        <span class="node-name" :title="node.name">
          {{ node.name }}
        </span>
        <button
          v-if="level > 0 && node.type === `file` && isArchivedDraftPath(node.path, rootPath)"
          type="button"
          class="tree-node__move"
          title="取消归档"
          @click.stop="emit('archive', node)"
        >
          <Undo2 class="h-3 w-3" />
        </button>
        <button
          v-else-if="level > 0 && node.type === `file`"
          type="button"
          class="tree-node__move"
          title="归档到「归档」"
          @click.stop="emit('archive', node)"
        >
          <Archive class="h-3 w-3" />
        </button>
        <button
          v-if="level > 0 && node.type === `directory` && !isArchiveDirectory(node.path, rootPath)"
          type="button"
          class="tree-node__move"
          title="移动到别的文件夹"
          @click.stop="emit('move', node)"
        >
          <FolderInput class="h-3 w-3" />
        </button>
        <button
          v-if="level > 0 && node.type === `directory`"
          type="button"
          class="tree-node__remove"
          title="空文件夹才能删"
          @click.stop="emit('remove', node)"
        >
          <Trash2 class="h-3 w-3" />
        </button>
      </div>

      <!-- 递归渲染子节点（紧接在父节点之后） -->
      <FolderTree
        v-if="node.type === 'directory' && isExpanded(node.path) && node.children"
        :nodes="node.children"
        :selected-path="selectedPath"
        :expanded-paths="expandedPaths"
        :checked-paths="checkedPaths"
        :root-path="rootPath"
        :level="level + 1"
        @select="(node, event) => emit('select', node, event)"
        @toggle-expand="emit('toggleExpand', $event)"
        @toggle-check="(node, event) => emit('toggleCheck', node, event)"
        @remove="emit('remove', $event)"
        @move="emit('move', $event)"
        @archive="emit('archive', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.folder-tree {
  user-select: none;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  white-space: nowrap;
}

.tree-node:hover {
  background-color: hsl(var(--accent) / 0.1);
}

.tree-node.selected {
  background-color: hsl(var(--accent) / 0.2);
  font-weight: 500;
}

.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.toggle-icon-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.tree-node__check,
.tree-node__check-spacer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.tree-node__check {
  border: 1px solid hsl(var(--muted-foreground));
  border-radius: 3px;
  background: hsl(var(--background));
  color: hsl(var(--primary-foreground));
}

.tree-node__check.checked {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary));
}

.tree-node__check-spacer {
  border: 1px solid transparent;
}

.node-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
}

.tree-node.selected .node-icon {
  color: hsl(var(--primary));
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-node.directory .node-name {
  font-weight: 500;
}

.tree-node__move,
.tree-node__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 4px;
  color: hsl(var(--muted-foreground));
  border-radius: 4px;
  opacity: 0.65;
}

.tree-node__move:hover,
.tree-node__remove:hover {
  color: hsl(var(--primary));
  background: hsl(var(--accent) / 0.4);
}

.tree-node__remove:hover {
  color: hsl(var(--destructive));
}
</style>
