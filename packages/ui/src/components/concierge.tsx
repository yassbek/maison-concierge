"use client";

import { ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, CreditCard, Download, FileText, Globe2, Headphones, LayoutDashboard, Mail, MapPin, Menu, MessageSquare, Mic, MoreHorizontal, Plane, Plus, Search, Settings2, ShieldCheck, Sparkles, Users, Wallet, X, Car, Building2, Utensils, Compass, Ship, Phone, AlertCircle, ListChecks, Send, RefreshCw, Link2, Paperclip, Loader2, LogOut } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import type { ComponentProps, ReactNode } from "react";

const icons = { arrow: ArrowRight, northeast: ArrowUpRight, inbound: ArrowDownLeft, bell: Bell, book: BookOpen, calendar: CalendarDays, check: Check, checks: CheckCheck, down: ChevronDown, left: ChevronLeft, right: ChevronRight, help: CircleHelp, clock: Clock3, credit: CreditCard, download: Download, document: FileText, globe: Globe2, headphones: Headphones, overview: LayoutDashboard, mail: Mail, pin: MapPin, menu: Menu, message: MessageSquare, mic: Mic, more: MoreHorizontal, flight: Plane, plus: Plus, search: Search, settings: Settings2, shield: ShieldCheck, sparkle: Sparkles, users: Users, wallet: Wallet, close: X, transfer: Car, villa: Building2, hotel: Building2, dining: Utensils, experience: Compass, yacht: Ship, other: Compass, phone: Phone, alert: AlertCircle, tasks: ListChecks, send: Send, refresh: RefreshCw, link: Link2, attachment: Paperclip, loading: Loader2, logout: LogOut };
export type MaisonIconName = keyof typeof icons;
export function MaisonIcon({ name, size = 18, ...props }: { name: MaisonIconName; size?: number } & ComponentProps<"svg">) {
  const Icon = icons[name];
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" {...props} />;
}
export function MaisonButton({ tone = "primary", size = "normal", children, ...props }: Omit<ComponentProps<typeof Button>, "size"> & { tone?: "primary" | "secondary" | "quiet" | "danger"; size?: "normal" | "small" | "icon" }) {
  return <Button {...props} className={`m-button m-button-${tone} m-button-${size}`} variant="ghost">{children}</Button>;
}
export function MaisonBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`m-badge m-badge-${tone}`}><span />{children}</span>;
}
export function MaisonAvatar({ name, size = "normal" }: { name: string; size?: "normal" | "small" | "large" }) {
  return <span className={`m-avatar m-avatar-${size}`} aria-label={name}>{name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("")}</span>;
}
export function MaisonInput(props: ComponentProps<"input">) { return <input {...props} className="m-input" />; }
export function MaisonTextarea(props: ComponentProps<"textarea">) { return <textarea {...props} className="m-input m-textarea" />; }
export function MaisonSelect(props: ComponentProps<"select">) { return <select {...props} className="m-input m-select" />; }
export function MaisonField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="m-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function MaisonDialog({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}><DialogContent className={`maison-app m-dialog ${wide ? "m-dialog-wide" : ""}`}><DialogHeader><DialogTitle className="m-dialog-title">{title}</DialogTitle><DialogDescription>{description || "Review the details before saving."}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}
export function MaisonEmpty({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="m-empty"><MaisonIcon name="check" size={28} /><h3>{title}</h3><p>{description}</p>{children}</div>;
}
