export default function Wrapper(props: { children: any }) {
  return <div style={{ border: '1px solid #535353' }}>{props.children}</div>;
}
