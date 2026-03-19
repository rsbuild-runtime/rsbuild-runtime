import styles from './index.less';
import './home.less';

export default function IndexPage(props: any) {
  console.log('home props', props);
  return (
    <div className="myHome">
      <h1 className={styles.home}>Home</h1>
    </div>
  );
}
