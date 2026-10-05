"use client";

import {
	MaisonButton,
	MaisonField,
	MaisonIcon,
	MaisonInput,
	MaisonSelect,
	MaisonTextarea,
} from "@crm/ui/components/concierge";
import { conciergeCommand } from "@crm/validation/concierge";
import { useCallback, useRef, useState } from "react";
import type { Execute, Snapshot } from "./types";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechSession = {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	onresult:
		| ((event: {
				resultIndex: number;
				results: ArrayLike<SpeechResult>;
		  }) => void)
		| null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
	start: () => void;
	stop: () => void;
	abort: () => void;
};
type SpeechWindow = Window & {
	SpeechRecognition?: new () => SpeechSession;
	webkitSpeechRecognition?: new () => SpeechSession;
};

export function CaptureForm({
	data,
	caseId,
	execute,
	onDone,
}: {
	data: Snapshot;
	caseId?: string;
	execute: Execute;
	onDone: (id: string) => void;
}) {
	const [text, setText] = useState("");
	const [channel, setChannel] = useState("manual");
	const [saving, setSaving] = useState(false);
	const [importing, setImporting] = useState(false);
	const [listening, setListening] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const session = useRef<SpeechSession | null>(null);
	const lock = useRef(false);
	const cleanup = useCallback((node: HTMLFormElement | null) => {
		if (!node) return;
		return () => {
			if (session.current) {
				session.current.onresult = null;
				session.current.onerror = null;
				session.current.onend = null;
				session.current.abort();
				session.current = null;
			}
		};
	}, []);
	function dictate() {
		setError("");
		if (session.current) {
			session.current.stop();
			return;
		}
		const browser = window as SpeechWindow;
		const Recognition =
			browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
		if (!Recognition) {
			setNotice(
				"This browser does not support dictation. Paste a transcript or use your device keyboard dictation.",
			);
			return;
		}
		const recognition = new Recognition();
		recognition.lang = navigator.language || "en-GB";
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.onresult = (event) => {
			let transcript = "";
			for (
				let index = event.resultIndex;
				index < event.results.length;
				index++
			) {
				const result = event.results[index];
				if (result?.isFinal) transcript += `${result[0].transcript} `;
			}
			setText(
				(previous) => `${previous}${previous ? "\n" : ""}${transcript.trim()}`,
			);
			setNotice("Dictation added. Review the text before saving.");
		};
		recognition.onerror = () => {
			setError(
				"Dictation fails. Check microphone access, or paste a transcript.",
			);
		};
		recognition.onend = () => {
			session.current = null;
			setListening(false);
		};
		session.current = recognition;
		try {
			recognition.start();
			setListening(true);
			setNotice("Listening. Speak your request, then select Stop dictation.");
		} catch {
			session.current = null;
			setListening(false);
			setError("Dictation cannot start. Paste a transcript instead.");
		}
	}
	return (
		<form
			ref={cleanup}
			className="m-form"
			aria-busy={saving || importing}
			onSubmit={async (event) => {
				event.preventDefault();
				if (lock.current || importing || listening) return;
				const fields = new FormData(event.currentTarget);
				const sender = fields.get("sender");
				const caseId = fields.get("caseId");
				setError("");
				const parsed = conciergeCommand.safeParse({
					type: "captureIntake",
					channel,
					sender: typeof sender === "string" ? sender : "",
					rawText: text,
					caseId: typeof caseId === "string" && caseId ? caseId : null,
				});
				if (!parsed.success) {
					setError(
						"Enter a sender and request text. Request text must contain at most 12,000 characters.",
					);
					return;
				}
				lock.current = true;
				setSaving(true);
				try {
					const result = await execute(parsed.data);
					onDone(result.id);
				} catch (cause) {
					setError(
						cause instanceof Error ? cause.message : "Save fails. Try again.",
					);
				} finally {
					lock.current = false;
					setSaving(false);
				}
			}}
		>
			<fieldset className="m-form-grid" disabled={saving || importing}>
				<p className="m-helper m-full">
					Capture a request for review. Email and WhatsApp are manual imports.
					No live account is connected here.
				</p>
				<MaisonField label="Source">
					<MaisonSelect
						name="channel"
						value={channel}
						onChange={(event) => setChannel(event.target.value)}
					>
						<option value="manual">Manual note</option>
						<option value="email">Email</option>
						<option value="whatsapp">WhatsApp</option>
						<option value="phone">Phone call</option>
					</MaisonSelect>
				</MaisonField>
				<MaisonField label="Sender">
					<MaisonInput
						name="sender"
						required
						maxLength={200}
						placeholder="Client, assistant, or supplier name"
					/>
				</MaisonField>
				<div className="m-full">
					<MaisonField label="Case context">
						<MaisonSelect name="caseId" defaultValue={caseId ?? ""}>
							<option value="">Assign during review</option>
							{data.cases.map((item) => (
								<option key={item.id} value={item.id}>
									{item.reference} · {item.title}
								</option>
							))}
						</MaisonSelect>
					</MaisonField>
				</div>
				<div className="m-full">
					<MaisonField
						label="Request text"
						hint="Paste the original message or write the call notes. Preserve dates, references, and sender wording."
					>
						<MaisonTextarea
							name="rawText"
							required
							maxLength={12000}
							rows={9}
							value={text}
							onChange={(event) => setText(event.target.value)}
							placeholder="Please arrange a private transfer for four guests…"
						/>
					</MaisonField>
					<p className="m-helper">
						{text.length.toLocaleString()} / 12,000 characters
					</p>
				</div>
				<MaisonField
					label="Import a text file"
					hint=".txt or .eml, up to 12 KB. Review email headers and content before saving."
				>
					<MaisonInput
						type="file"
						accept=".txt,.eml,text/plain,message/rfc822"
						disabled={listening}
						onChange={async (event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (!file) return;
							setError("");
							if (!/\.(txt|eml)$/i.test(file.name) || file.size > 12000) {
								setError("Select a .txt or .eml file up to 12 KB.");
								return;
							}
							setImporting(true);
							try {
								const content = await file.text();
								const combined = `${text}${text ? "\n\n" : ""}${content}`;
								if (combined.length > 12000) {
									setError(
										"The combined request exceeds 12,000 characters. Shorten the text before importing.",
									);
									return;
								}
								setText(combined);
								if (/\.eml$/i.test(file.name)) setChannel("email");
								setNotice(
									`Imported ${file.name}. Review the text before saving.`,
								);
							} catch {
								setError("The file cannot be read. Paste the text instead.");
							} finally {
								setImporting(false);
							}
						}}
					/>
				</MaisonField>
				<div>
					<MaisonButton type="button" tone="secondary" onClick={dictate}>
						<MaisonIcon name="mic" />
						{listening ? "Stop dictation" : "Start dictation"}
					</MaisonButton>
					<p className="m-helper">
						Dictation uses your browser speech service and microphone
						permission. Browser support varies.
					</p>
				</div>
			</fieldset>
			<p className="m-helper" role="status">
				{importing ? "Reading file…" : notice}
			</p>
			{error && (
				<p className="m-form-error" role="alert">
					{error}
				</p>
			)}
			<div className="m-form-actions">
				<MaisonButton type="submit" disabled={saving || importing || listening}>
					{saving ? "Saving…" : "Save for review"}
					<MaisonIcon name="arrow" />
				</MaisonButton>
			</div>
		</form>
	);
}
