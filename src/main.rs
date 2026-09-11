mod io;
mod llm;

#[tokio::main]
async fn main() {
    let mut chat = llm::Chat::new();

    // Bot greets the user first
    chat.greet().await;

    println!();

    loop {
        let message = io::read_input();

        if message.eq_ignore_ascii_case("exit") || message.eq_ignore_ascii_case("quit") {
            println!("Astra : Bye! See you at the Tech Fest! 👋");
            break;
        }

        if message.is_empty() {
            continue;
        }

        chat.send(message).await;

        println!();
    }
}
