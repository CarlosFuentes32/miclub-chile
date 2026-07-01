import { Link } from 'react-router-dom';

export function Brand({ prominent = false }: { prominent?: boolean }) {
  if (prominent) {
    return <Link to="/" className="brand-horizontal" aria-label="MiClub Chile">
      <img src="/logo-miclub-chile-icon.png" alt="" />
      <span className="brand-copy">
        <strong>Mi Club Chile</strong>
        <small><i/> Clientes que se unen, comercios que crecen <i/></small>
      </span>
    </Link>;
  }

  return <Link to="/" className="inline-flex items-center">
    <img src="/logo-miclub-chile-transparent.png" alt="MiClub Chile" className="h-20 w-auto object-contain md:h-24" />
  </Link>;
}
