"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import styles from "./FloatingMenu.module.css";

// Add new pages here; the menu grows without touching any layout.
const MENU_ITEMS = [
  { href: "/", label: "トップ" },
  { href: "/vote-rehearsal", label: "リハーサル投票" },
  { href: "/committee", label: "合唱委員会" },
] as const;

export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on navigation.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={styles.container}>
      <nav
        id={menuId}
        className={styles.menu}
        aria-label="サイトメニュー"
        hidden={!isOpen}
      >
        <ul className={styles.list}>
          {MENU_ITEMS.map((item) => {
            const isCurrent =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  className={styles.link}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <button
        ref={buttonRef}
        className={styles.toggle}
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.icon} aria-hidden="true" data-open={isOpen}>
          <span />
          <span />
          <span />
        </span>
        <span className={styles.toggleLabel}>
          {isOpen ? "閉じる" : "メニュー"}
        </span>
      </button>
    </div>
  );
}
