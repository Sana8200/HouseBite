import { useState } from 'react'
import { supabase } from '../../supabase'

export function Test() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [text, setText] = useState("test")

  const signupClick = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      window.alert(error.message)
      return
    }

    // Create the family_member row linked to auth.users
    const userId = data.user?.id
    if (userId) {
      const { error: memberError } = await supabase
        .from("family_member")
        .insert({ id: userId })

      if (memberError) {
        window.alert("User created but family_member insert failed: " + memberError.message)
        return
      }
    }

    window.alert("Signed up OK")
  }

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
        <button onClick={() => void(signupClick())}>
          Sign up
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
