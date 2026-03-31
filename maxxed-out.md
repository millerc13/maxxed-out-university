All right, so it's been a while since I've worked on this project. This is a project for Todd that is sort of his flagship course platform. Since I last worked on this project, I have come to learn a lot more and need to redo/revamp this entire project. I'm not sure if it would be better starting over or if it would be better to try and update what I have.

Essentially, I have pushed away from using go high-level as much. I still use it for SMS automations as well as emails, in general lead/contact storing. But things in this project such as sinking to go high level for products is simply something I don't really need to do. Instead for things like making purchases what I will do is have a internal web hook automation that is triggered once for example a stripe.payment intent is successful.

Another massive overhaul for this project will be the database. I have come to really like using super base and I have a premium plan there as well as a project already set up. It is just empty. I have supabase mcp server set up and it has worked great for other projects so I would like to do the same for this one.

I also have been using Playwright MCP server and would like to get that set up for this project as well. 

So first what I think you should do is go and look at every single file in this project and give me a report on the current tech stack / frameworks/UI frameworks that this is using and provide what you think I should do as in terms of starting from scratch and whatnot.

I wouldn't mind setting up things like login with apple and login with google for this project. When I first started, Todd didn't want me to move that far away from go high level but now that he's seen the work I can do. I think he trust me to build this out however I want.