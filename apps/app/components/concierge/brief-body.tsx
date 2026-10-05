function linesOf(content: string) {
	let offset = 0;
	return content
		.replace(/^MAISON\n\n/, "")
		.split("\n")
		.map((line) => {
			const row = {
				line: line.replace(/\\([\\`*_{}[\]()#+<>|])/g, "$1"),
				id: `line-${offset}`,
			};
			offset += line.length + 1;
			return row;
		});
}
export function BriefBody({ content }: { content: string }) {
	return (
		<div className="m-brief-text">
			{linesOf(content).map(({ line, id }) =>
				line.startsWith("# ") ? (
					<h1 key={id}>{line.slice(2)}</h1>
				) : line.startsWith("## ") ? (
					<h2 key={id}>{line.slice(3)}</h2>
				) : line.startsWith("### ") ? (
					<h3 key={id}>{line.slice(4)}</h3>
				) : line.startsWith("- ") ? (
					<p className="m-brief-bullet" key={id}>
						{line.slice(2)}
					</p>
				) : line.trim() ? (
					<p key={id}>{line}</p>
				) : (
					<div className="m-brief-spacer" key={id} />
				),
			)}
		</div>
	);
}
