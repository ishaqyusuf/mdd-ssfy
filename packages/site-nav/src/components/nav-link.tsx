import { useSiteNav } from "./use-site-nav";

export const NavLink = (props) => {
  const { props: _props } = useSiteNav();
  const Lnk = _props.Link;
  if (Lnk) return <Lnk {...props} />;
  return <a {...props}>{props.children}</a>;
};
