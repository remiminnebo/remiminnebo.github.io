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
    </div>
  );
}

export default App;