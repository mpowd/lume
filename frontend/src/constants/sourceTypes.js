import { Globe, FolderOpen, StickyNote, Mail } from 'lucide-react'

export const SOURCE_TYPES = [
  { 
    id: 'website', 
    label: 'Website', 
    icon: Globe, 
    description: 'Crawl web pages',
    implemented: true,
    color: 'blue'
  },
  { 
    id: 'filesystem', 
    label: 'Files', 
    icon: FolderOpen, 
    description: 'Upload documents',
    implemented: false,
    color: 'purple'
  },
  { 
    id: 'notion', 
    label: 'Notion', 
    icon: StickyNote, 
    description: 'Import workspace',
    implemented: false,
    color: 'slate'
  },
  { 
    id: 'email', 
    label: 'Email', 
    icon: Mail, 
    description: 'Connect inbox',
    implemented: false,
    color: 'green'
  }
]