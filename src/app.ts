//Project custom type
enum ProjectStatus {
  Active,
  Finished,
}
class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

//Project State Management class
type Listener<T> = (items: Project[]) => void;

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}

class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  addProject(title: string, description: string, numOfPeople: number) {
    const NewProject = new Project(
      Math.random().toString(),
      title,
      description,
      numOfPeople,
      ProjectStatus.Active
    );
    this.projects.push(NewProject);
    for (const listenerFn of this.listeners) {
      listenerFn(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

//Validation
interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

/* Sert à vérifier la validité des champs remplis dans le formulaire
    retourne 1 si tous les champs sont valides, 0 sinon
*/
function validate(validatableInput: Validatable) {
  let isValid = true;
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }
  if (
    validatableInput.minLength !== null &&
    typeof validatableInput.value === "string"
  ) {
    isValid =
      isValid && validatableInput.value.length > validatableInput.minLength!;
  }
  if (
    validatableInput.maxLength !== null &&
    typeof validatableInput.value === "string"
  ) {
    isValid =
      isValid && validatableInput.value.length < validatableInput.maxLength!;
  }
  if (
    validatableInput.min !== null &&
    typeof validatableInput.value === "number"
  ) {
    isValid = isValid && validatableInput.value > validatableInput.min!;
  }
  if (
    validatableInput.max !== null &&
    typeof validatableInput.value === "number"
  ) {
    isValid = isValid && validatableInput.value < validatableInput.max!;
  }
  return !isValid;
}

//Autobind decorator
/* Ce décorateur nous permet de ne pas avoir à ajouter la propriété .bind(this) 
pour chaque eventListener ajouté */
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    },
  };
  return adjDescriptor;
}

//Component Base class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(
    templateID: string,
    hostElementId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = <HTMLTemplateElement>(
      document.getElementById(templateID)
    );
    this.hostElement = <T>document.getElementById(hostElementId)!;

    const importedHtmlContent = document.importNode(
      this.templateElement.content,
      true
    );

    this.element = <U>importedHtmlContent.firstElementChild;
    if (newElementId) {
      this.element.id = newElementId;
    }
    this.attach(insertAtStart);
  }

  private attach(insertAtBeginning: boolean) {
    this.hostElement.insertAdjacentElement(
      insertAtBeginning ? "afterbegin" : "beforeend",
      this.element
    );
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

//ProjectList class
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
  assignedProjects: Project[];

  constructor(private type: "active" | "finished") {
    super("projects-list", "app", false, `${type}-project`);
    this.assignedProjects = [];

    this.configure();
    this.renderContent();
  }

  configure() {
    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((prj) => {
        if (this.type === "active") {
          return prj.status === ProjectStatus.Active;
        } else {
          prj.status === ProjectStatus.Finished;
        }
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    });
  }

  renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector("ul")!.id = listId;
    this.element.querySelector("h2")!.textContent =
      this.type.toUpperCase() + "PROJECTS";
  }

  private renderProjects() {
    const listEl = <HTMLUListElement>(
      document.getElementById(`${this.type}-projects-list`)
    );
    listEl.innerHTML = "";
    for (const prjItem of this.assignedProjects) {
      const listItem = document.createElement("li");
      listItem.textContent = prjItem.title;
      listEl.appendChild(listItem);
    }
  }
}

//ProjectInput class
/* Cette classe accède aux elements du DOM, fait le rendu du formulaire 
et s'occupe de toute la logique derrière la validation
*/
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputelement: HTMLInputElement;
  descriptionInputelement: HTMLInputElement;
  peopleInputelement: HTMLInputElement;

  constructor() {
    super("project-input", "app", true, "user-input");

    this.titleInputelement = <HTMLInputElement>(
      this.element.querySelector("#title")
    );
    this.descriptionInputelement = <HTMLInputElement>(
      this.element.querySelector("#description")
    );
    this.peopleInputelement = <HTMLInputElement>(
      this.element.querySelector("#people")
    );

    this.configure();
  }

  configure() {
    this.element.addEventListener("submit", this.submitHandler);
  }

  renderContent() {}

  /* Récupère les valeurs saisies dans le formulaire et les
  assigne à des objets qui pourront être passés en arguments
  de la fonction validate et les vérifie */
  private gatherUserInput(): [string, string, number] | void {
    const enteredTitle = this.titleInputelement.value;
    const enteredDescription = this.descriptionInputelement.value;
    const enteredPeopleAmount = this.peopleInputelement.value;

    const titleValidatable: Validatable = {
      value: enteredTitle,
      required: true,
    };
    const descriptionValidatable: Validatable = {
      value: enteredDescription,
      required: true,
      minLength: 5,
    };
    const peopleAmountValidatable: Validatable = {
      value: enteredPeopleAmount,
      required: true,
      min: 1,
      max: 5,
    };

    if (
      !validate(titleValidatable) ||
      !validate(descriptionValidatable) ||
      !validate(peopleAmountValidatable)
    ) {
      alert("ERREUR: Veillez à bien remplir l'intégralité du formulaire!");
      return;
    } else {
      return [enteredTitle, enteredDescription, +enteredPeopleAmount];
    }
  }

  /* Vide le formulaire après qu'on ait cliqué sur le bouton */
  private clearInputs() {
    this.titleInputelement.value = "";
    this.descriptionInputelement.value = "";
    this.peopleInputelement.value = "";
  }

  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.gatherUserInput();
    if (Array.isArray(userInput)) {
      const [title, desc, people] = userInput;
      console.log(title, desc, people);
      projectState.addProject(title, desc, people);
      this.clearInputs();
    }
  }
}

const prjInput = new ProjectInput();
const activePrjlist = new ProjectList("active");
const finishedPrjlist = new ProjectList("finished");
