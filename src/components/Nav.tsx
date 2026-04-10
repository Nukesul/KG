import "../styles/Nav.css";

export default function Nav() {
  return (
    <div className="ConBlock">
      <div className="ConBlock__MinBlock">
        <div className="nav-links">
          <a href="#">Главная</a>
          <a href="#">Регионы</a>
          <a href="#">Места</a>
          <a href="#" className="more-link">Ещё</a>
        </div>
      </div>
    </div>
  );
}