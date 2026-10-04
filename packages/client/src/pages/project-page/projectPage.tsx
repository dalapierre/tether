import { Link, useParams } from 'react-router-dom';
import { styles } from './projectPage.styles';

export function ProjectPage() {
    const { id } = useParams<{ id: string }>();

    return (
        <main className={styles.main}>
            <Link to='/' className={styles.back}>
                ← Projects
            </Link>
            <h1 className={styles.title}>Project</h1>
            <p className={styles.body}>Project coming soon{id ? ` (${id})` : ''}.</p>
        </main>
    );
}
