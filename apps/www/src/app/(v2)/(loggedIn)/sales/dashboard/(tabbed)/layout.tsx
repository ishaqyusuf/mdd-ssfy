import ServerTab from "../_components/server-tab";

export default function Layout({ children }) {
	return (
		<>
			<ServerTab />
			{children}
		</>
	);
}
