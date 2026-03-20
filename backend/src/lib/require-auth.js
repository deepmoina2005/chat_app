import { auth } from "./auth.js";


export async function requireAuth(req , res , next) {
    try {
        const session = await auth.api.getSession({headers:req.headers})
        
        if(!session?.user?.id){
            console.log("Auth Failed for:", req.url, "Headers:", JSON.stringify(req.headers, null, 2));
            return res.status(401).json({message:"Unauthorized"})
        }

        req.user = session?.user;
        req.session = session?.session;

        return next()
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        return res.status(401).json({message:"Unauthorized"})
    }
}