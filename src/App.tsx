import logo from './logo.svg';

function App(): JSX.Element {
  return (
    <div style={{
      backgroundColor: '#03BFF3',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <img src={logo} alt="Logo" style={{ width: '700px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <div style={{ color: 'white', fontSize: '48px', fontWeight: 'bold' }}>MINNEBO AI</div>
    </div>
  );
}

export default App;