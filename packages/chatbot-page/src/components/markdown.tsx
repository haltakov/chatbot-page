"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

const components: Components = {
  h1: ({ children }) => <h1 className="cp-md-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="cp-md-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="cp-md-h3">{children}</h3>,
  p: ({ children }) => <p className="cp-md-p">{children}</p>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="cp-md-a"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="cp-md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="cp-md-ol">{children}</ol>,
  li: ({ children }) => <li className="cp-md-li">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="cp-md-blockquote">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="cp-md-code">
      {children}
    </code>
  ),
  strong: ({ children }) => <strong className="cp-md-strong">{children}</strong>,
  hr: () => <hr className="cp-md-hr" />,
  table: ({ children }) => (
    <div className="cp-md-table-wrap">
      <table className="cp-md-table">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="cp-md-th">{children}</th>
  ),
  td: ({ children }) => <td className="cp-md-td">{children}</td>,
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="cp-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
