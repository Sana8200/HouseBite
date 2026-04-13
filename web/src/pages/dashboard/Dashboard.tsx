import { useState } from 'react'
import { supabase } from '../../supabase'

export function Test() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [text, setText] = useState("test")

  const loginClick = async () => {
    const result = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (result.error) {
      window.alert(result.error)
      return;
    }

    window.alert("OK")
  }

  const helloClick = async () => {
    const result = await supabase.functions.invoke<{message: string}>("hello-world", {
      body: {
        name: text,
      }
    })

    if (result.error) {
      window.alert(result.error)
      return;
    }

    window.alert(result.data!.message);
  }

  return (
    <>
      <div>
        <p>Login</p>

        <input type='email' value={email} onChange={(e) => setEmail(e.target.value)}/>
        <input type='password' value={password} onChange={(e) => setPassword(e.target.value)}/>

        <button onClick={() => void(loginClick())}>
          Login
        </button>
      </div>

      <div>
        <p>Hello</p>

        <input value={text} onChange={(e) => setText(e.target.value)}/>

        <button onClick={() => void(helloClick())}>
          Test
        </button>
      </div>
    </>
  )
}
