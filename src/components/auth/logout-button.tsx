import { logoutAction } from "@/app/auth/actions";
export function LogoutButton(){return <form action={logoutAction}><button className="button-secondary" type="submit">Sair da conta</button></form>}
