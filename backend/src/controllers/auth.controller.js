import User from '../models/User.js';
import { upsertStreamUser } from '../lib/stream.js';
import jwt from 'jsonwebtoken';

export async function signup(req, res) {
    const { email, password, fullName } = req.body;
    try {
        // Here you would typically save the user to the database        
        if (!email || !password || !fullName) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists, please use different email" });
        }

        // Create a new user
        const idx = Math.floor(Math.random() * 100) + 1; 
        const randomAvatar=`https://avatar.iran.liara.run/public/${idx}.png`;
        const newUser = await User.create({
            email,
            fullName,
            password,
            profilePic: randomAvatar,
        });

        // Upsert user in Stream        
        try {
            await upsertStreamUser({
                id: newUser._id.toString(),
                name: newUser.fullName,
                image: newUser.profilePic || "",
            });
            console.log(`Stream user created for ${newUser.fullName}`);
        } catch (error) {
            console.log("Error creating Stream user:", error);
        }
      

        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        );

        res.cookie("jwt", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000 ,// 7 days
            httpOnly: true, // prevents client-side JavaScript from accessing the cookie
            sameSite: "strict", // 'strict' or 'lax' based on your requirements. prevent CSRF attacks
            secure: process.env.NODE_ENV === "production", // use secure cookies in production
        });

        res.status(201).json({
            success: true,
            user:newUser
        });

    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: "Internal server error" });
    }    
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        )

        res.cookie("jwt", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,// 7 days
            httpOnly: true, // prevents client-side JavaScript from accessing the cookie
            sameSite: "strict", // 'strict' or 'lax' based on your requirements. prevent CSRF attacks
            secure: process.env.NODE_ENV === "production", // use secure cookies in production
        });

        res.status(200).json({
            success: true,
            user,
        });   
    }
    catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: "Internal server error" });
    }
}


// Logout function to clear the cookie
// This function will be called when the user logs out
export function logout(req, res) {
    res.clearCookie("jwt");
    res.status(200).json({ success:true, message: "Logged out successfully" });
}

export async function onboard(req, res) {
    try {
        const userId = req.user._id;

        const { fullName, bio, nativeLanguage, learningLanguage, location } = req.body;

        if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
            return res.status(400).json({
                message: "All fields are required",
                missingFields: [
                    !fullName && "fullName",
                    !bio && "bio",
                    !nativeLanguage && "nativeLanguage",
                    !learningLanguage && "learningLanguage",
                    !location && "location",
                ].filter(Boolean),
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                ...req.body,
                isOnboarded: true,
            },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
            });
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
        } catch (streamError) {
            console.log("Error updating Stream user during onboarding:", streamError.message);
        }

        res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Onboarding error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
  