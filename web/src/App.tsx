import { useState } from 'react'
import './App.css'
import { supabase } from './supabase'

function App() {
  const [text, setText] = useState("test")

  const btnClick = async () => {
    const result = await supabase.functions.invoke("hello-world", {
      body: {
        name: text,
      }
    })

    window.alert(JSON.stringify(result, null, 2));
  }

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)}/>
      <button onClick={() => void(btnClick())}>
        Test
      </button>
    </>
  )
}

export default App
