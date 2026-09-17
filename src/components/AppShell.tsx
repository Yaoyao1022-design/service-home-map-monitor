import { useState, type ReactNode } from 'react'

const TOP_MENUS = [
  { key: 'home', label: '首页' },
  { key: 'monitor', label: '一级菜单', active: true },
]

const ICON_MENUS = [
  { key: 'home', label: '首页', icon: '/nav/icon-home.svg' },
  { key: 'monitor', label: '菜单入口', icon: '/nav/icon-export.svg', active: true },
  { key: 'order', label: '菜单入口', icon: '/nav/icon-ecology.svg' },
  { key: 'site', label: '菜单入口', icon: '/nav/icon-feedback.svg' },
  { key: 'staff', label: '菜单入口', icon: '/nav/icon-form.svg' },
  { key: 'cap', label: '菜单入口', icon: '/nav/icon-help.svg' },
  { key: 'data', label: '菜单入口', icon: '/nav/icon-data.svg' },
]

const TREE_CHILDREN = [
  '三级菜单',
  '三级菜单',
  '三级菜单',
  '网点列表',
  '三级菜单',
  '三级菜单',
  '三级菜单',
]

const TABS = [
  { id: 'current', title: '当前菜单名称', active: true },
  { id: '2', title: '当前菜单名称' },
  { id: '3', title: '当前菜单名称' },
  { id: '4', title: '当前菜单名称' },
  { id: '5', title: '当前菜单名称' },
  { id: '6', title: '当前菜单名称' },
]

type Props = {
  children: ReactNode
}

export function AppShell({ children }: Props) {
  const [collapsed, setCollapsed] = useState(true)
  const [groupOpen, setGroupOpen] = useState(true)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img className="logo-img" src="/nav/logo.svg" alt="京东服务工作台" />
        </div>
        <button className="outlet-chip" type="button">
          <img src="/nav/home-mini.svg" alt="" />
          网点端
        </button>
        <nav className="top-nav">
          {TOP_MENUS.map((item) => (
            <button className={item.active ? 'active' : ''} key={item.key} type="button">
              {item.label}
            </button>
          ))}
        </nav>
        <div className="user-area">
          <button className="notice" type="button">
            <img src="/nav/notice.svg" alt="" />
            <span>通知</span>
            <i className="badge">5</i>
          </button>
          <img className="avatar" src="/nav/avatar.svg" alt="" />
          <span className="user-name">郝铭梓</span>
        </div>
      </header>

      <div className="body">
        <aside className={`sider ${collapsed ? 'is-collapsed' : 'is-expanded'}`}>
          {collapsed ? (
            <div className="sider-icons">
              {ICON_MENUS.map((item) => (
                <button className={`sider-icon ${item.active ? 'active' : ''}`} key={item.key} type="button">
                  <img src={item.icon} alt="" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sider-tree">
              <button className="tree-group" type="button" onClick={() => setGroupOpen((v) => !v)}>
                <span>二级菜单</span>
                <i className={`tree-arrow ${groupOpen ? 'open' : ''}`} />
              </button>
              {groupOpen &&
                TREE_CHILDREN.map((name, i) => (
                  <button className={`tree-item ${name === '网点列表' ? 'active' : ''}`} key={`${name}-${i}`} type="button">
                    {name}
                  </button>
                ))}
            </div>
          )}
          <button
            className="sider-toggle"
            type="button"
            title={collapsed ? '展开菜单' : '收起菜单'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <img src={collapsed ? '/nav/toggle-expand.svg' : '/nav/toggle-collapse.svg'} alt="" />
          </button>
        </aside>

        <div className="main">
          <div className="tabs">
            {TABS.map((tab) => (
              <div className={`tab ${tab.active ? 'active' : ''}`} key={tab.id}>
                <span>{tab.title}</span>
                <span className="tab-close">
                  <img src="/nav/tab-close.svg" alt="" />
                </span>
              </div>
            ))}
          </div>
          <div className="workspace">{children}</div>
        </div>
      </div>
    </div>
  )
}
